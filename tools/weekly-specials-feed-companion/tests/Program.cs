using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Web;
using System.Web.Hosting;
using MvcApplication1.Models;
using WeeklySpecialsFeed.Companion;

internal static class Program
{
    private static int Main()
    {
        try
        {
            VerifyFeedShapeOrderingAndImageVersions();
            VerifyMissingAndUnreadableImagesAreSkipped();
            VerifyEmptyFeed();
            VerifyQueryFailureReturnsError();
            VerifyExplicitConfiguration();
            VerifyReplacingImageChangesVersion();
            Console.WriteLine("All Weekly Specials fixture tests passed.");
            return 0;
        }
        catch (Exception exception)
        {
            Console.Error.WriteLine(exception.ToString());
            return 1;
        }
    }

    private static void VerifyFeedShapeOrderingAndImageVersions()
    {
        WeeklySpecialsFeedHandler handler = CreateHandler(
            new FixtureRepository(new[]
            {
                CreateLink(3, "B", "physical/path/3.pdf"),
                new WebPdfLink { RecordId = 4, Name = "Hidden", Enabled = false, IsWeeklySpecial = true },
                new WebPdfLink { RecordId = 5, Name = "Other type", Enabled = true, IsWeeklySpecial = false },
                CreateLink(1, "A", "physical/path/1.pdf")
            }),
            new FixtureImages(new Dictionary<int, string> { { 1, "638974440000000000" }, { 3, "638974440000000100" } }));
        string json = Run(handler, "GET");

        Assert(json.Contains("\"recordId\":1"), "The first item should be sorted by name.");
        Assert(json.IndexOf("\"name\":\"A\"", StringComparison.Ordinal) < json.IndexOf("\"name\":\"B\"", StringComparison.Ordinal), "Items should be ordered by name.");
        Assert(json.Contains("\"imageVersion\":\"638974440000000000\""), "The image modification version should be serialized.");
        Assert(json.Contains("https://legacy-test.invalid/uploads/weeklyspecialimg1.png"), "Image URLs should use the explicitly configured host.");
        Assert(!json.Contains("PdfDocument") && !json.Contains("physical/path") && !json.Contains("638974440000000000.pdf"), "The feed must omit PDFs and physical paths.");
        AssertPropertyShape(json);
    }

    private static void VerifyMissingAndUnreadableImagesAreSkipped()
    {
        FixtureImages images = new FixtureImages(new Dictionary<int, string> { { 1, "638974440000000000" } });
        images.Errors[2] = new FileNotFoundException();
        images.Errors[3] = new UnauthorizedAccessException();
        WeeklySpecialsFeedHandler handler = CreateHandler(
            new FixtureRepository(new[] { CreateLink(1, "A", null), CreateLink(2, "B", null), CreateLink(3, "C", null) }),
            images);

        string json = Run(handler, "GET");
        Assert(json.Contains("\"recordId\":1") && !json.Contains("\"recordId\":2") && !json.Contains("\"recordId\":3"), "Missing and unreadable images should be skipped.");
    }

    private static void VerifyEmptyFeed()
    {
        string json = Run(CreateHandler(new FixtureRepository(new WebPdfLink[0]), new FixtureImages(new Dictionary<int, string>())), "GET");
        Assert(json == "{\"items\":[]}", "An empty list should be a successful empty feed.");
    }

    private static void VerifyQueryFailureReturnsError()
    {
        WeeklySpecialsFeedHandler handler = CreateHandler(new FixtureRepository(null) { QueryError = true }, new FixtureImages(new Dictionary<int, string>()));
        string json = Run(handler, "GET", 500);
        Assert(json.Contains("\"error\":\"Weekly specials are temporarily unavailable.\""), "Query failures should return a generic error.");
        Assert(!json.Contains("connection") && !json.Contains("path"), "Query errors must not expose configuration or filesystem details.");
    }

    private static void VerifyExplicitConfiguration()
    {
        AssertThrows<ArgumentException>(() => new WeeklySpecialsFeedOptions(null, "/uploads", new[] { "https://store.example" }));
        AssertThrows<ArgumentException>(() => new WeeklySpecialsFeedOptions("http://legacy-test.invalid", "/uploads", new[] { "https://store.example" }));
        AssertThrows<ArgumentException>(() => new WeeklySpecialsFeedOptions("https://legacy-test.invalid", "/uploads", new string[0]));
        WeeklySpecialsFeedOptions options = new WeeklySpecialsFeedOptions(
            "https://legacy-test.invalid",
            "/uploads",
            new[] { "https://store.example", "http://127.0.0.1:9292" });
        Assert(options.AllowsOrigin("https://store.example"), "The explicitly allowed storefront origin should be accepted.");
        Assert(options.AllowsOrigin("http://127.0.0.1:9292"), "An explicit loopback development origin should be accepted.");
        Assert(!options.AllowsOrigin("https://unlisted.example"), "An unlisted origin should be rejected.");
    }

    private static void VerifyReplacingImageChangesVersion()
    {
        string fixtureDirectory = Path.Combine(Path.GetTempPath(), "weekly-specials-fixture-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(fixtureDirectory);
        string fixtureImage = Path.Combine(fixtureDirectory, "weeklyspecialimg42.png");
        try
        {
            File.WriteAllBytes(fixtureImage, new byte[] { 1, 2, 3 });
            DateTime firstWrite = new DateTime(2026, 10, 29, 12, 0, 0, DateTimeKind.Utc);
            File.SetLastWriteTimeUtc(fixtureImage, firstWrite);
            WeeklySpecialsFeedOptions options = new WeeklySpecialsFeedOptions(
                "https://legacy-test.invalid",
                "/uploads",
                new[] { "https://store.example" });
            UploadImageRevisionProvider revisions = new UploadImageRevisionProvider(options, fixtureDirectory);
            string firstVersion = revisions.GetImageVersion(42);

            File.WriteAllBytes(fixtureImage, new byte[] { 4, 5, 6, 7 });
            DateTime replacementWrite = firstWrite.AddMinutes(1);
            File.SetLastWriteTimeUtc(fixtureImage, replacementWrite);
            string replacementVersion = revisions.GetImageVersion(42);

            Assert(firstVersion == firstWrite.Ticks.ToString(System.Globalization.CultureInfo.InvariantCulture), "The initial image version should use the file's UTC modification time.");
            Assert(replacementVersion == replacementWrite.Ticks.ToString(System.Globalization.CultureInfo.InvariantCulture), "Replacing the image should update the version.");
            Assert(firstVersion != replacementVersion, "Replacing the image must change the cache-busting version.");
        }
        finally
        {
            if (File.Exists(fixtureImage))
            {
                File.Delete(fixtureImage);
            }

            if (Directory.Exists(fixtureDirectory))
            {
                Directory.Delete(fixtureDirectory);
            }
        }
    }

    private static WeeklySpecialsFeedHandler CreateHandler(IWeeklySpecialsRepository repository, IImageRevisionProvider images)
    {
        return new WeeklySpecialsFeedHandler(
            new WeeklySpecialsFeedOptions("https://legacy-test.invalid", "/uploads", new[] { "https://store.example" }),
            repository,
            images);
    }

    private static string Run(WeeklySpecialsFeedHandler handler, string method, int expectedStatus = 200)
    {
        StringWriter output = new StringWriter();
        SimpleWorkerRequest request = new SimpleWorkerRequest("/", AppDomain.CurrentDomain.BaseDirectory, "api/weekly-specials.ashx", string.Empty, output);
        HttpContext context = new HttpContext(request);
        context.Request.RequestType = method;
        handler.ProcessRequest(context);
        context.Response.Flush();
        Assert(context.Response.StatusCode == expectedStatus, "Unexpected response status: " + context.Response.StatusCode);
        return output.ToString();
    }

    private static WebPdfLink CreateLink(int id, string name, string pdfPath)
    {
        return new WebPdfLink
        {
            RecordId = id,
            Name = name,
            Enabled = true,
            IsWeeklySpecial = true,
            PdfDocument = pdfPath
        };
    }

    private static void AssertPropertyShape(string json)
    {
        int occurrences = 0;
        foreach (string property in new[] { "\"recordId\":", "\"name\":", "\"imageUrl\":", "\"imageVersion\":" })
        {
            occurrences += CountOccurrences(json, property);
        }

        Assert(occurrences == 8, "Each returned item should contain exactly the four permitted properties.");
        Assert(!json.Contains("\"description\"") && !json.Contains("\"enabled\"") && !json.Contains("\"pdf"), "The feed must expose only approved fields.");
    }

    private static int CountOccurrences(string value, string search)
    {
        int count = 0;
        int offset = 0;
        while ((offset = value.IndexOf(search, offset, StringComparison.Ordinal)) >= 0)
        {
            count++;
            offset += search.Length;
        }

        return count;
    }

    private static void AssertThrows<TException>(Action action) where TException : Exception
    {
        try
        {
            action();
        }
        catch (TException)
        {
            return;
        }

        throw new InvalidOperationException("Expected exception " + typeof(TException).Name + ".");
    }

    private static void Assert(bool condition, string message)
    {
        if (!condition)
        {
            throw new InvalidOperationException(message);
        }
    }

    private sealed class FixtureRepository : IWeeklySpecialsRepository
    {
        private readonly IList<WebPdfLink> _items;

        public FixtureRepository(IEnumerable<WebPdfLink> items)
        {
            _items = items == null ? null : items.ToList();
        }

        public bool QueryError { get; set; }

        public IList<WebPdfLink> GetActiveWeeklySpecials()
        {
            if (QueryError)
            {
                throw new InvalidOperationException("Fixture query failure.");
            }

            return WeeklySpecialsQuery.ActiveOrdered(_items.AsQueryable()).ToList();
        }
    }

    private sealed class FixtureImages : IImageRevisionProvider
    {
        private readonly IDictionary<int, string> _versions;

        public FixtureImages(IDictionary<int, string> versions)
        {
            _versions = versions;
            Errors = new Dictionary<int, Exception>();
        }

        public IDictionary<int, Exception> Errors { get; private set; }

        public string GetImageVersion(int recordId)
        {
            if (Errors.ContainsKey(recordId))
            {
                throw Errors[recordId];
            }

            string version;
            if (!_versions.TryGetValue(recordId, out version))
            {
                throw new FileNotFoundException();
            }

            return version;
        }
    }
}
