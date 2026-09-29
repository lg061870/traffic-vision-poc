using TrafficVision.Api.Configuration;
using TrafficVision.Api.Services;

var builder = WebApplication.CreateBuilder(args);

const string frontendCorsPolicy = "FrontendDevelopment";

var allowedOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>() ?? ["http://localhost:5173", "http://127.0.0.1:5173"];

builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.Configure<PassengerVisionOptions>(
    builder.Configuration.GetSection(PassengerVisionOptions.SectionName));
builder.Services.AddSingleton<PassengerImageAnalyzer>();
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
