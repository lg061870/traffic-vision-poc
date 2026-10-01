using Innova.OnboardComputer.App.Contracts;
using Innova.OnboardComputer.App.Sources;

namespace Innova.OnboardComputer.App.Sending;

/// <summary>
/// Takes everything the sources collected since the last message and wraps it in a
/// <see cref="RawVehicleMessage"/>. Parts with no new readings are left out.
/// </summary>
public sealed class MessageBuilder(
    IGpsSource gps,
    IDoorCounterSource doorCounter,
    IVisionSource vision,
    SequenceGenerator sequence,
    TimeProvider time)
{
    /// <summary>Returns null when no source produced anything, since the API needs at least one part.</summary>
    public RawVehicleMessage? Build()
    {
        var sentences = gps.DrainSentences();
        var events = doorCounter.DrainEvents();
        var frames = vision.DrainFrames();
        if (sentences.Count == 0 && events.Count == 0 && frames.Count == 0)
        {
            return null;
        }

        return new RawVehicleMessage(
            sequence.Next(),
            time.GetUtcNow(),
            sentences.Count == 0 ? null : new RawGps(RawFormats.Nmea0183, sentences),
            events.Count == 0 ? null : new RawDoorCounter(doorCounter.Format, events.OrderBy(item => item.At).ToArray()),
            frames.Count == 0 ? null : new RawVision(vision.Model, vision.Camera, frames.OrderBy(frame => frame.At).ToArray()));
    }
}
