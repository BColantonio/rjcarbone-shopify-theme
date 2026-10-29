using System;
using System.Collections.Generic;
using System.Configuration;
using System.IO;
using System.Linq;
using System.Security;
using System.Text;
using System.Web;
using System.Web.Script.Serialization;
using MvcApplication1.Models;

namespace WeeklySpecialsFeed.Companion
{
    public sealed class WeeklySpecialsFeedOptions
    {
        private readonly Uri _legacyPublicBaseUri;
        private readonly HashSet<string> _allowedOrigins;

        public string UploadDirectory { get; private set; }

        public WeeklySpecialsFeedOptions(string legacyPublicBaseUrl, string uploadDirectory, IEnumerable<string> allowedOrigins)
        {
            Uri baseUri;
            if (!Uri.TryCreate(legacyPublicBaseUrl, UriKind.Absolute, out baseUri) ||
                baseUri.Scheme != Uri.UriSchemeHttps ||
                !string.IsNullOrEmpty(baseUri.UserInfo) ||
                baseUri.AbsolutePath != "/" ||
                !string.IsNullOrEmpty(baseUri.Query) ||
                !string.IsNullOrEmpty(baseUri.Fragment))
            {
                throw new ArgumentException("A verified HTTPS legacy hostname is required.", "legacyPublicBaseUrl");
            }

            UploadDirectory = NormalizeUploadDirectory(uploadDirectory);
            LegacyPublicBaseUrl = baseUri.GetLeftPart(UriPartial.Authority);
            _legacyPublicBaseUri = new Uri(LegacyPublicBaseUrl + "/", UriKind.Absolute);
            _allowedOrigins = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (string origin in allowedOrigins ?? Enumerable.Empty<string>())
            {
                string normalizedOrigin = NormalizeOrigin(origin);
                if (!_allowedOrigins.Add(normalizedOrigin))
                {
                    continue;
                }
            }

            if (_allowedOrigins.Count == 0)
            {
                throw new ArgumentException("At least one explicit storefront origin is required.", "allowedOrigins");
            }
        }

        public string LegacyPublicBaseUrl { get; private set; }

        public string ImageUrl(int recordId)
        {
            string relativePath = UploadDirectory.Trim('/') + "/weeklyspecialimg" + recordId.ToString(System.Globalization.CultureInfo.InvariantCulture) + ".png";
            return new Uri(_legacyPublicBaseUri, relativePath).AbsoluteUri;
        }

        public bool AllowsOrigin(string origin)
        {
            string normalizedOrigin;
            return TryNormalizeOrigin(origin, out normalizedOrigin) && _allowedOrigins.Contains(normalizedOrigin);
        }

        public static WeeklySpecialsFeedOptions FromAppSettings()
        {
            string origins = ConfigurationManager.AppSettings["WeeklySpecialsFeed.AllowedOrigins"] ?? string.Empty;
            string[] allowedOrigins = origins.Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries)
                .Select(origin => origin.Trim())
                .Where(origin => origin.Length > 0)
                .ToArray();

            return new WeeklySpecialsFeedOptions(
                ConfigurationManager.AppSettings["WeeklySpecialsFeed.LegacyPublicBaseUrl"],
                ConfigurationManager.AppSettings["uploadDirectory"],
                allowedOrigins);
        }

        private static string NormalizeUploadDirectory(string uploadDirectory)
        {
            if (string.IsNullOrWhiteSpace(uploadDirectory) || uploadDirectory.IndexOf('\\') >= 0 ||
                uploadDirectory.IndexOf('?') >= 0 || uploadDirectory.IndexOf('#') >= 0)
            {
                throw new ArgumentException("A valid upload directory is required.", "uploadDirectory");
            }

            string normalized = uploadDirectory.Trim().Trim('/');
            string[] segments = normalized.Split('/');
            if (normalized.Length == 0 || segments.Any(segment => segment.Length == 0 || segment == "." || segment == ".."))
            {
                throw new ArgumentException("A valid upload directory is required.", "uploadDirectory");
            }

            return "/" + normalized;
        }

        private static string NormalizeOrigin(string origin)
        {
            string normalized;
            if (!TryNormalizeOrigin(origin, out normalized))
            {
                throw new ArgumentException("Every allowed storefront origin must be an HTTP(S) origin without a path.", "allowedOrigins");
            }

            return normalized;
        }

        private static bool TryNormalizeOrigin(string origin, out string normalized)
        {
            normalized = null;
            Uri uri;
            if (string.IsNullOrWhiteSpace(origin) ||
                !Uri.TryCreate(origin, UriKind.Absolute, out uri) ||
                (uri.Scheme != Uri.UriSchemeHttps && uri.Scheme != Uri.UriSchemeHttp) ||
                !string.IsNullOrEmpty(uri.UserInfo) ||
                uri.AbsolutePath != "/" ||
                !string.IsNullOrEmpty(uri.Query) ||
                !string.IsNullOrEmpty(uri.Fragment) ||
                (uri.Scheme == Uri.UriSchemeHttp && !uri.IsLoopback))
            {
                return false;
            }

            normalized = uri.GetLeftPart(UriPartial.Authority).TrimEnd('/');
            return true;
        }
    }

    public interface IWeeklySpecialsRepository
    {
        IList<WebPdfLink> GetActiveWeeklySpecials();
    }

    public interface IImageRevisionProvider
    {
        string GetImageVersion(int recordId);
    }

    public static class WeeklySpecialsQuery
    {
        public static IQueryable<WebPdfLink> ActiveOrdered(IQueryable<WebPdfLink> links)
        {
            if (links == null)
            {
                throw new ArgumentNullException("links");
            }

            return links
                .Where(link => link.Enabled && link.IsWeeklySpecial)
                .OrderBy(link => link.Name);
        }
    }

    public sealed class WeeklySpecialsFeedHandler : IHttpHandler
    {
        private const string FeedError = "Weekly specials are temporarily unavailable.";
        private readonly WeeklySpecialsFeedOptions _options;
        private readonly IWeeklySpecialsRepository _repository;
        private readonly IImageRevisionProvider _imageRevisionProvider;
        private readonly bool _configurationUnavailable;

        public WeeklySpecialsFeedHandler()
        {
            try
            {
                _options = WeeklySpecialsFeedOptions.FromAppSettings();
                _repository = new SmartWeeklySpecialsRepository();
                _imageRevisionProvider = new UploadImageRevisionProvider(_options);
            }
            catch (ArgumentException)
            {
                _configurationUnavailable = true;
                System.Diagnostics.Trace.TraceError("Weekly Specials feed configuration is unavailable or invalid.");
            }
        }

        public WeeklySpecialsFeedHandler(
            WeeklySpecialsFeedOptions options,
            IWeeklySpecialsRepository repository,
            IImageRevisionProvider imageRevisionProvider)
        {
            _options = options ?? throw new ArgumentNullException("options");
            _repository = repository ?? throw new ArgumentNullException("repository");
            _imageRevisionProvider = imageRevisionProvider ?? throw new ArgumentNullException("imageRevisionProvider");
        }

        public bool IsReusable
        {
            get { return false; }
        }

        public void ProcessRequest(HttpContext context)
        {
            if (context == null)
            {
                throw new ArgumentNullException("context");
            }

            context.Response.ContentType = "application/json";
            context.Response.ContentEncoding = Encoding.UTF8;
            context.Response.AddHeader("Vary", "Origin");

            if (_configurationUnavailable)
            {
                WriteError(context, 503);
                return;
            }

            string origin = context.Request.Headers["Origin"];
            if (!string.IsNullOrEmpty(origin))
            {
                if (!_options.AllowsOrigin(origin))
                {
                    WriteError(context, 403);
                    return;
                }

                context.Response.AddHeader("Access-Control-Allow-Origin", origin);
                context.Response.AddHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
                context.Response.AddHeader("Access-Control-Max-Age", "600");
            }

            string method = context.Request.HttpMethod;
            if (string.Equals(method, "OPTIONS", StringComparison.OrdinalIgnoreCase))
            {
                context.Response.StatusCode = 204;
                context.Response.SuppressContent = true;
                return;
            }

            if (!string.Equals(method, "GET", StringComparison.OrdinalIgnoreCase))
            {
                WriteError(context, 405);
                return;
            }

            IList<WebPdfLink> rows;
            try
            {
                rows = _repository.GetActiveWeeklySpecials();
            }
            catch (Exception)
            {
                System.Diagnostics.Trace.TraceError("Weekly Specials feed query failed.");
                WriteError(context, 500);
                return;
            }

            List<WeeklySpecialItem> items = new List<WeeklySpecialItem>();
            foreach (WebPdfLink row in rows)
            {
                if (row == null)
                {
                    continue;
                }

                string imageVersion;
                try
                {
                    imageVersion = _imageRevisionProvider.GetImageVersion(row.RecordId);
                }
                catch (IOException)
                {
                    LogSkippedImage(row.RecordId);
                    continue;
                }
                catch (UnauthorizedAccessException)
                {
                    LogSkippedImage(row.RecordId);
                    continue;
                }
                catch (SecurityException)
                {
                    LogSkippedImage(row.RecordId);
                    continue;
                }
                catch (HttpException)
                {
                    LogSkippedImage(row.RecordId);
                    continue;
                }

                items.Add(new WeeklySpecialItem
                {
                    recordId = row.RecordId,
                    name = row.Name ?? string.Empty,
                    imageUrl = _options.ImageUrl(row.RecordId),
                    imageVersion = imageVersion
                });
            }

            context.Response.Cache.SetCacheability(HttpCacheability.Public);
            context.Response.Cache.SetMaxAge(TimeSpan.FromSeconds(60));
            context.Response.Write(new JavaScriptSerializer().Serialize(new WeeklySpecialsFeedResponse { items = items }));
        }

        private static void LogSkippedImage(int recordId)
        {
            System.Diagnostics.Trace.TraceWarning("Weekly Specials image skipped for record {0}.", recordId);
        }

        private static void WriteError(HttpContext context, int statusCode)
        {
            context.Response.StatusCode = statusCode;
            context.Response.Cache.SetCacheability(HttpCacheability.NoCache);
            context.Response.Cache.SetNoStore();
            context.Response.Write(new JavaScriptSerializer().Serialize(new WeeklySpecialsFeedError { error = FeedError }));
        }
    }

    internal sealed class SmartWeeklySpecialsRepository : IWeeklySpecialsRepository
    {
        public IList<WebPdfLink> GetActiveWeeklySpecials()
        {
            using (SMARTEntities context = new SMARTEntities())
            {
                return WeeklySpecialsQuery.ActiveOrdered(context.WebPdfLink)
                    .ToList();
            }
        }
    }

    public sealed class UploadImageRevisionProvider : IImageRevisionProvider
    {
        private readonly WeeklySpecialsFeedOptions _options;
        private readonly string _physicalUploadDirectory;

        public UploadImageRevisionProvider(WeeklySpecialsFeedOptions options)
        {
            _options = options ?? throw new ArgumentNullException("options");
        }

        public UploadImageRevisionProvider(WeeklySpecialsFeedOptions options, string physicalUploadDirectory)
        {
            _options = options ?? throw new ArgumentNullException("options");
            _physicalUploadDirectory = physicalUploadDirectory ?? throw new ArgumentNullException("physicalUploadDirectory");
        }

        public string GetImageVersion(int recordId)
        {
            string physicalUploadDirectory = _physicalUploadDirectory ??
                HttpContext.Current.Server.MapPath("~" + _options.UploadDirectory);
            string root = Path.GetFullPath(physicalUploadDirectory).TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
            string imagePath = Path.GetFullPath(Path.Combine(root, "weeklyspecialimg" + recordId.ToString(System.Globalization.CultureInfo.InvariantCulture) + ".png"));
            if (!imagePath.StartsWith(root, StringComparison.OrdinalIgnoreCase))
            {
                throw new SecurityException();
            }

            FileInfo file = new FileInfo(imagePath);
            if (!file.Exists)
            {
                throw new FileNotFoundException();
            }

            return file.LastWriteTimeUtc.Ticks.ToString(System.Globalization.CultureInfo.InvariantCulture);
        }
    }

    public sealed class WeeklySpecialsFeedResponse
    {
        public List<WeeklySpecialItem> items { get; set; }
    }

    public sealed class WeeklySpecialItem
    {
        public int recordId { get; set; }

        public string name { get; set; }

        public string imageUrl { get; set; }

        public string imageVersion { get; set; }
    }

    internal sealed class WeeklySpecialsFeedError
    {
        public string error { get; set; }
    }
}
