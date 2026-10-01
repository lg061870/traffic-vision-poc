using Innova.Occupancy.Api.Vehicles;

namespace Innova.Occupancy.Api.Tests;

public sealed class VehicleIdTests
{
    [Theory]
    [InlineData("SJB-8754", "SJB-8754")]
    [InlineData("sjb 8754", "SJB-8754")]
    [InlineData(" SJB_8754 ", "SJB-8754")]
    [InlineData("sjb--8754", "SJB-8754")]
    [InlineData("8754", "8754")]
    public void Normalizes_plates_written_different_ways(string input, string expected)
    {
        Assert.True(VehicleId.TryNormalize(input, out var id));
        Assert.Equal(expected, id);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("../etc")]
    [InlineData("SJB/8754")]
    [InlineData("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456")]
    public void Rejects_invalid_ids(string? input)
    {
        Assert.False(VehicleId.TryNormalize(input, out _));
    }
}
