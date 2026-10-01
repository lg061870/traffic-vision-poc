using System.Text.Json;
using System.Text.Json.Serialization;
using Innova.Occupancy.Api.Configuration;
using Innova.Occupancy.Api.Vehicles;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers().AddJsonOptions(options =>
    // SNAKE_CASE_UPPER enum names match GTFS-Realtime, e.g. FEW_SEATS_AVAILABLE.
    options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.SnakeCaseUpper)));
builder.Services.AddOpenApi(options => options.AddDocumentTransformer((document, _, _) =>
{
    // Tools such as Postman join the server URL with each path; a trailing slash makes "//api/...".
    foreach (var server in document.Servers ?? [])
    {
        server.Url = server.Url?.TrimEnd('/');
    }

    return Task.CompletedTask;
}));
builder.Services.AddProblemDetails();

builder.Services.Configure<OccupancyApiOptions>(builder.Configuration.GetSection(OccupancyApiOptions.SectionName));
builder.Services.Configure<IngestionOptions>(builder.Configuration.GetSection(IngestionOptions.SectionName));
builder.Services.Configure<MockFleetOptions>(builder.Configuration.GetSection(MockFleetOptions.SectionName));
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton<VehicleStateStore>();
builder.Services.AddHostedService<MockFleetSimulator>();

// Read access is open while client apps are built against the mock; writes need a device key.
builder.Services.AddCors(options => options.AddDefaultPolicy(policy =>
    policy.AllowAnyOrigin().AllowAnyHeader().WithMethods("GET")));

var app = builder.Build();

app.UseExceptionHandler();
app.UseCors();

// The OpenAPI document is the contract client teams generate their types from.
app.MapOpenApi();
app.MapControllers();

if (app.Configuration.GetSection(IngestionOptions.SectionName).Get<IngestionOptions>()?.DeviceKeys.Count is null or 0)
{
    app.Logger.LogWarning("No Ingestion:DeviceKeys configured: any caller can post observations. Use only for local development.");
}

app.Run();

public partial class Program;
