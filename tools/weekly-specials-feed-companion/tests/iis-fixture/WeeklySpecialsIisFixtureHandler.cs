using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using MvcApplication1.Models;
using WeeklySpecialsFeed.Companion;

namespace WeeklySpecialsFeed.IisFixture
{
    public sealed class WeeklySpecialsIisFixtureHandler : IHttpHandler
    {
        private readonly WeeklySpecialsFeedHandler _handler;

        public WeeklySpecialsIisFixtureHandler()
        {
            WeeklySpecialsFeedOptions options = WeeklySpecialsFeedOptions.FromAppSettings();
            string scenario = HttpContext.Current.Request.QueryString["scenario"];
            _handler = new WeeklySpecialsFeedHandler(
                options,
                new FixtureRepository(scenario),
                new UploadImageRevisionProvider(options));
        }

        public bool IsReusable
        {
            get { return false; }
        }

        public void ProcessRequest(HttpContext context)
        {
            _handler.ProcessRequest(context);
        }
    }

    internal sealed class FixtureRepository : IWeeklySpecialsRepository
    {
        private readonly string _scenario;

        public FixtureRepository(string scenario)
        {
            _scenario = scenario;
        }

        public IList<WebPdfLink> GetActiveWeeklySpecials()
        {
            if (string.Equals(_scenario, "error", StringComparison.Ordinal))
            {
                throw new InvalidOperationException("Fixture repository failure.");
            }

            if (string.Equals(_scenario, "empty", StringComparison.Ordinal))
            {
                return new List<WebPdfLink>();
            }

            List<WebPdfLink> fixtures = new List<WebPdfLink>
            {
                new WebPdfLink { RecordId = 41, Name = "Zinnia fixture", Enabled = true, IsWeeklySpecial = true },
                new WebPdfLink { RecordId = 44, Name = "Disabled fixture", Enabled = false, IsWeeklySpecial = true },
                new WebPdfLink { RecordId = 45, Name = "Other type fixture", Enabled = true, IsWeeklySpecial = false },
                new WebPdfLink { RecordId = 12, Name = "Aster fixture", Enabled = true, IsWeeklySpecial = true }
            };

            return WeeklySpecialsQuery.ActiveOrdered(fixtures.AsQueryable()).ToList();
        }
    }
}
