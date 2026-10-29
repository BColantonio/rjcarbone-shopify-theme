param(
    [string]$LegacyBinPath = 'C:\Users\RJC Office 1\Desktop\website\bin',
    [string]$ShopifyPreviewOrigin = 'http://127.0.0.1:9292'
)

$ErrorActionPreference = 'Stop'
$companionRoot = Split-Path -Parent $PSScriptRoot
$fixtureProject = Join-Path $PSScriptRoot 'iis-fixture\WeeklySpecialsFeed.IisFixture.csproj'
$companionProject = Join-Path $companionRoot 'WeeklySpecialsFeed.Companion.csproj'
$iisExpress = 'C:\Program Files\IIS Express\iisexpress.exe'
$iisTemplate = 'C:\Program Files\IIS Express\config\templates\PersonalWebServer\applicationhost.config'

foreach ($requiredPath in @($LegacyBinPath, $fixtureProject, $companionProject, $iisExpress, $iisTemplate)) {
    if (-not (Test-Path -LiteralPath $requiredPath)) {
        throw "Required local IIS fixture dependency is unavailable: $requiredPath"
    }
}

$fixtureOrigin = ([Uri]$ShopifyPreviewOrigin).GetLeftPart([System.UriPartial]::Authority)
if ($fixtureOrigin -ne $ShopifyPreviewOrigin.TrimEnd('/')) {
    throw 'ShopifyPreviewOrigin must be a single exact HTTP(S) origin with no path.'
}
if ($fixtureOrigin.StartsWith('http://', [StringComparison]::OrdinalIgnoreCase) -and
    -not ([Uri]$fixtureOrigin).IsLoopback) {
    throw 'HTTP is permitted only for an explicitly selected loopback development-preview origin.'
}

$testRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('weekly-specials-iis-fixture-' + [Guid]::NewGuid().ToString('N'))
$siteRoot = Join-Path $testRoot 'site'
$buildRoot = Join-Path $testRoot 'build'
$siteBin = Join-Path $siteRoot 'bin'
$uploadRoot = Join-Path $siteRoot 'uploads'
$portListener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, 0)
$iisProcess = $null

function Assert-Equal($actual, $expected, [string]$message) {
    if ($actual -cne $expected) {
        throw "$message Expected '$expected'; received '$actual'."
    }
}

function Invoke-FeedRequest([string]$url, [string]$origin) {
    $request = [System.Net.HttpWebRequest]::Create($url)
    $request.Method = 'GET'
    $request.Accept = 'application/json'
    $request.AllowAutoRedirect = $false
    if ($origin) {
        $request.Headers.Add('Origin', $origin)
    }

    try {
        $response = [System.Net.HttpWebResponse]$request.GetResponse()
    }
    catch [System.Net.WebException] {
        if ($_.Exception.Response -isnot [System.Net.HttpWebResponse]) {
            throw
        }
        $response = [System.Net.HttpWebResponse]$_.Exception.Response
    }

    try {
        $reader = New-Object System.IO.StreamReader($response.GetResponseStream())
        try {
            $content = $reader.ReadToEnd()
        }
        finally {
            $reader.Dispose()
        }

        return [pscustomobject]@{
            Status = [int]$response.StatusCode
            Content = $content
            AllowOrigin = $response.Headers['Access-Control-Allow-Origin']
            CacheControl = $response.Headers['Cache-Control']
        }
    }
    finally {
        $response.Dispose()
    }
}

try {
    New-Item -ItemType Directory -Path $siteBin, $uploadRoot, $buildRoot -Force | Out-Null

    $companionOutput = Join-Path $buildRoot 'companion'
    $fixtureOutput = Join-Path $buildRoot 'iis-fixture'
    & dotnet build $companionProject --configuration Release --verbosity quiet --output $companionOutput "-p:LegacyBinPath=$LegacyBinPath"
    if ($LASTEXITCODE -ne 0) {
        throw 'Companion assembly build failed.'
    }

    & dotnet build $fixtureProject --configuration Release --verbosity quiet --output $fixtureOutput "-p:LegacyBinPath=$LegacyBinPath"
    if ($LASTEXITCODE -ne 0) {
        throw 'IIS fixture assembly build failed.'
    }

    foreach ($assembly in Get-ChildItem -LiteralPath $fixtureOutput -Filter '*.dll' -File) {
        Copy-Item -LiteralPath $assembly.FullName -Destination $siteBin
    }

    [byte[]]$imageBytes = @(137, 80, 78, 71, 13, 10, 26, 10)
    foreach ($recordId in @(12, 41)) {
        [System.IO.File]::WriteAllBytes((Join-Path $uploadRoot "weeklyspecialimg$recordId.png"), $imageBytes)
    }

    $webConfig = @"
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <appSettings>
    <add key="WeeklySpecialsFeed.LegacyPublicBaseUrl" value="https://weekly-specials-fixture.invalid" />
    <add key="WeeklySpecialsFeed.AllowedOrigins" value="$fixtureOrigin" />
    <add key="uploadDirectory" value="/uploads" />
  </appSettings>
  <system.web>
    <compilation debug="true" targetFramework="4.7.2" />
    <httpRuntime targetFramework="4.7.2" />
  </system.web>
</configuration>
"@
    [System.IO.File]::WriteAllText((Join-Path $siteRoot 'web.config'), $webConfig, (New-Object System.Text.UTF8Encoding($false)))

    $handlerFile = @'
<%@ WebHandler Language="C#" Class="WeeklySpecialsFeed.IisFixture.WeeklySpecialsIisFixtureHandler, WeeklySpecialsFeed.IisFixture" %>
'@
    $apiDirectory = Join-Path $siteRoot 'api'
    New-Item -ItemType Directory -Path $apiDirectory -Force | Out-Null
    [System.IO.File]::WriteAllText((Join-Path $apiDirectory 'weekly-specials.ashx'), $handlerFile, (New-Object System.Text.UTF8Encoding($false)))

    [xml]$applicationHost = Get-Content -LiteralPath $iisTemplate -Raw
    $sites = $applicationHost.configuration.'system.applicationHost'.sites
    foreach ($site in @($sites.site)) {
        [void]$sites.RemoveChild($site)
    }

    $portListener.Start()
    $port = ([System.Net.IPEndPoint]$portListener.LocalEndpoint).Port
    $portListener.Stop()

    $site = $applicationHost.CreateElement('site')
    $site.SetAttribute('name', 'WeeklySpecialsFixture')
    $site.SetAttribute('id', '1901')
    $site.SetAttribute('serverAutoStart', 'true')

    $application = $applicationHost.CreateElement('application')
    $application.SetAttribute('path', '/')
    $application.SetAttribute('applicationPool', 'Clr4IntegratedAppPool')
    $virtualDirectory = $applicationHost.CreateElement('virtualDirectory')
    $virtualDirectory.SetAttribute('path', '/')
    $virtualDirectory.SetAttribute('physicalPath', $siteRoot)
    [void]$application.AppendChild($virtualDirectory)
    [void]$site.AppendChild($application)

    $bindings = $applicationHost.CreateElement('bindings')
    $binding = $applicationHost.CreateElement('binding')
    $binding.SetAttribute('protocol', 'http')
    $binding.SetAttribute('bindingInformation', "127.0.0.1:$port`:")
    [void]$bindings.AppendChild($binding)
    [void]$site.AppendChild($bindings)
    [void]$sites.AppendChild($site)

    $applicationHostPath = Join-Path $testRoot 'applicationhost.config'
    $applicationHost.Save($applicationHostPath)

    $iisStdout = Join-Path $testRoot 'iisexpress.stdout.log'
    $iisStderr = Join-Path $testRoot 'iisexpress.stderr.log'
    $iisProcess = Start-Process -FilePath $iisExpress -ArgumentList @("/config:`"$applicationHostPath`"", '/site:WeeklySpecialsFixture', '/systray:false', '/trace:error') -PassThru -WindowStyle Hidden -RedirectStandardOutput $iisStdout -RedirectStandardError $iisStderr
    $feedUrl = "http://127.0.0.1:$port/api/weekly-specials.ashx"
    $ready = $false
    for ($attempt = 0; $attempt -lt 40; $attempt++) {
        if ($iisProcess.HasExited) {
            $diagnostic = @()
            if (Test-Path -LiteralPath $iisStdout) {
                $diagnostic += Get-Content -LiteralPath $iisStdout -Tail 12
            }
            if (Test-Path -LiteralPath $iisStderr) {
                $diagnostic += Get-Content -LiteralPath $iisStderr -Tail 12
            }
            throw "IIS Express exited before the fixture endpoint became ready (exit code $($iisProcess.ExitCode)). $($diagnostic -join ' ')"
        }

        try {
            $null = Invoke-FeedRequest $feedUrl $fixtureOrigin
            $ready = $true
            break
        }
        catch {
            Start-Sleep -Milliseconds 250
        }
    }
    if (-not $ready) {
        throw 'IIS Express fixture endpoint did not become ready in time.'
    }

    $default = Invoke-FeedRequest "$feedUrl`?check=active" $fixtureOrigin
    Assert-Equal $default.Status 200 'The IIS fixture feed request should succeed.'
    Assert-Equal $default.AllowOrigin $fixtureOrigin 'The exact preview origin should be allowed.'
    $payload = $default.Content | ConvertFrom-Json
    Assert-Equal $payload.items.Count 2 'Disabled and non-weekly records should be filtered.'
    Assert-Equal $payload.items[0].name 'Aster fixture' 'Enabled records should be sorted by Name.'
    Assert-Equal $payload.items[1].name 'Zinnia fixture' 'Enabled records should be sorted by Name.'
    foreach ($item in $payload.items) {
        $fieldNames = @($item.PSObject.Properties.Name | Sort-Object) -join ','
        Assert-Equal $fieldNames 'imageUrl,imageVersion,name,recordId' 'The JSON item should contain exactly the four permitted fields.'
    }
    if ($default.Content -match 'PdfDocument|weeklyspecialpdf|Server.MapPath|physical') {
        throw 'The feed response contains a forbidden PDF or physical-path field.'
    }

    $unlisted = Invoke-FeedRequest "$feedUrl`?check=unlisted" 'https://unlisted-origin.invalid'
    Assert-Equal $unlisted.Status 403 'An unlisted origin should be rejected.'
    Assert-Equal $unlisted.AllowOrigin $null 'An unlisted origin must not receive an allow-origin header.'
    $unlistedError = $unlisted.Content | ConvertFrom-Json
    Assert-Equal $unlistedError.error 'Weekly specials are temporarily unavailable.' 'Origin rejection should use the generic error body.'

    $empty = Invoke-FeedRequest "$feedUrl`?scenario=empty" $fixtureOrigin
    Assert-Equal $empty.Status 200 'An empty result should remain a successful response.'
    Assert-Equal (($empty.Content | ConvertFrom-Json).items.Count) 0 'The empty fixture should return no items.'

    $queryError = Invoke-FeedRequest "$feedUrl`?scenario=error" $fixtureOrigin
    Assert-Equal $queryError.Status 500 'A query failure should return HTTP 500.'
    $genericError = $queryError.Content | ConvertFrom-Json
    Assert-Equal $genericError.error 'Weekly specials are temporarily unavailable.' 'A query failure should return the generic error body.'
    if ($queryError.Content -match 'Fixture repository failure|connection|string|path') {
        throw 'The query error response leaked exception or configuration details.'
    }

    $imagePath = Join-Path $uploadRoot 'weeklyspecialimg12.png'
    $versionBefore = $payload.items[0].imageVersion
    [System.IO.File]::WriteAllBytes($imagePath, [byte[]]@(1, 2, 3, 4, 5))
    [System.IO.File]::SetLastWriteTimeUtc($imagePath, [DateTime]::UtcNow.AddMinutes(2))
    $afterReplace = Invoke-FeedRequest "$feedUrl`?check=replaced" $fixtureOrigin
    $payloadAfterReplace = $afterReplace.Content | ConvertFrom-Json
    $versionAfter = $payloadAfterReplace.items[0].imageVersion
    if ($versionBefore -eq $versionAfter) {
        throw 'Replacing the fixture image did not change imageVersion.'
    }

    Write-Output "IIS Express fixture endpoint: $feedUrl"
    Write-Output "Allowed development-preview Origin: $fixtureOrigin"
    Write-Output 'Passed: IIS handler response, JSON field allowlist, active filtering, Name ordering, empty results, generic query errors, CORS allow/reject, and image replacement versioning.'
}
finally {
    if ($portListener.Server.IsBound) {
        $portListener.Stop()
    }
    if ($iisProcess -and -not $iisProcess.HasExited) {
        Stop-Process -Id $iisProcess.Id
        $iisProcess.WaitForExit()
    }
    if (Test-Path -LiteralPath $testRoot) {
        Remove-Item -LiteralPath $testRoot -Recurse -Force
    }
}
