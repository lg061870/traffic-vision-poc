using TrafficVision.Api.Configuration;
using TrafficVision.Api.Services;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.AddDebug();

const string frontendCorsPolicy = "FrontendDevelopment";

var allowedOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>() ?? ["http://localhost:5173", "http://127.0.0.1:5173"];

builder.Services.AddControllers().AddJsonOptions(options =>
    options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddOpenApi();
builder.Services.Configure<PassengerVisionOptions>(
    builder.Configuration.GetSection(PassengerVisionOptions.SectionName));
builder.Services.AddSingleton<PassengerImageAnalyzer>();
builder.Services.AddSingleton<PassengerVideoAnalysisCoordinator>();
builder.Services.AddHostedService(provider =>
    provider.GetRequiredService<PassengerVideoAnalysisCoordinator>());
builder.Services.AddCors(options =>
{
    options.AddPolicy(frontendCorsPolicy, policy =>
    {
        policy
            .WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors(frontendCorsPolicy);
app.UseAuthorization();

app.MapControllers();

app.Run();
