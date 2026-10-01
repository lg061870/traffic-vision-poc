namespace Innova.OnboardComputer.App.Sending;

/// <summary>
/// The API ignores any message whose sequence is not above the last one it accepted from the
/// bus. Starting from the Unix time in milliseconds keeps sequences increasing across restarts
/// without storing state: the app sends far less than one message per millisecond.
/// </summary>
public sealed class SequenceGenerator
{
    private long _last;

    public SequenceGenerator(TimeProvider time) : this(time.GetUtcNow().ToUnixTimeMilliseconds())
    {
    }

    public SequenceGenerator(long first) => _last = first - 1;

    public long Next() => Interlocked.Increment(ref _last);
}
