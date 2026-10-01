using Innova.OnboardComputer.App.Contracts;

namespace Innova.OnboardComputer.App.Sources;

// Each source collects what its device produced since the last message. The simulated sources
// implement these today; a real GPS receiver, door counter or vision client replaces one by
// registering its own implementation, with nothing else changing.

/// <summary>A GPS receiver: raw NMEA 0183 sentences, exactly as the receiver wrote them.</summary>
public interface IGpsSource
{
    IReadOnlyList<string> DrainSentences();
}

/// <summary>A door counter: events in its own <see cref="Format"/>, read by the matching API adapter.</summary>
public interface IDoorCounterSource
{
    string Format { get; }

    /// <summary>Raised when a door closes, so the app can send right away.</summary>
    event EventHandler<RawDoorCounterEvent>? DoorClosed;

    IReadOnlyList<RawDoorCounterEvent> DrainEvents();
}

/// <summary>The vision inference API for one camera: detections per frame, never images.</summary>
public interface IVisionSource
{
    string Model { get; }

    string Camera { get; }

    IReadOnlyList<RawVisionFrame> DrainFrames();
}
