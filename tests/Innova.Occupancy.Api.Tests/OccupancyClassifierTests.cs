using Innova.Occupancy.Api.Configuration;
using Innova.Occupancy.Api.Models;
using Innova.Occupancy.Api.Vehicles;

namespace Innova.Occupancy.Api.Tests;

public sealed class OccupancyClassifierTests
{
    [Theory]
    [InlineData(0, 110, OccupancyStatus.Empty)]
    [InlineData(20, 110, OccupancyStatus.ManySeatsAvailable)]
    [InlineData(78, 110, OccupancyStatus.FewSeatsAvailable)]
    [InlineData(90, 110, OccupancyStatus.StandingRoomOnly)]
    [InlineData(107, 110, OccupancyStatus.CrushedStandingRoomOnly)]
    [InlineData(110, 110, OccupancyStatus.Full)]
    [InlineData(125, 110, OccupancyStatus.Full)]
    public void Maps_counts_to_gtfs_levels(int passengers, int capacity, OccupancyStatus expected)
    {
        var percent = OccupancyClassifier.Percent(passengers, capacity);

        Assert.Equal(expected, OccupancyClassifier.Classify(passengers, percent, new OccupancyThresholds()));
    }

    [Fact]
    public void Percent_rounds_like_the_rider_diagram()
    {
        Assert.Equal(71, OccupancyClassifier.Percent(78, 110));
    }
}
