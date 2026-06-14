using System.Diagnostics;
using System.Runtime.InteropServices;

var executableDirectory = AppContext.BaseDirectory;
var unpackedDirectory = Path.Combine(executableDirectory, "win-unpacked");
var dataRootDirectory = ResolveDataRoot(executableDirectory);
var libraryDirectory = Path.Combine(dataRootDirectory, "library");
var configDirectory = Path.Combine(dataRootDirectory, "config");

Directory.CreateDirectory(libraryDirectory);
Directory.CreateDirectory(configDirectory);

var targetExecutable = Directory.Exists(unpackedDirectory)
    ? Directory.GetFiles(unpackedDirectory, "*.exe", SearchOption.TopDirectoryOnly)
        .OrderByDescending(filePath => new FileInfo(filePath).Length)
        .FirstOrDefault()
    : null;

if (targetExecutable is null || !File.Exists(targetExecutable))
{
    NativeMethods.MessageBox(
        IntPtr.Zero,
        $"Cannot find the packaged app in {unpackedDirectory}",
        "ACGPlan",
        0x10);
    return 1;
}

using var process = Process.Start(new ProcessStartInfo
{
    FileName = targetExecutable,
    WorkingDirectory = Path.GetDirectoryName(targetExecutable) ?? executableDirectory,
    UseShellExecute = false,
    Environment =
    {
        ["ACGPLAN_WORKSPACE_ROOT"] = dataRootDirectory,
    },
});

process?.WaitForExit();
return process?.ExitCode ?? 0;

static string ResolveDataRoot(string executableDirectory)
{
    var parentDirectory = Directory.GetParent(executableDirectory)?.FullName;
    if (parentDirectory is not null && HasExistingLibrary(parentDirectory))
    {
        return parentDirectory;
    }

    return executableDirectory;
}

static bool HasExistingLibrary(string directory)
{
    var libraryDirectory = Path.Combine(directory, "library");
    var configPath = Path.Combine(directory, "config", "acgplan-settings.json");
    if (File.Exists(configPath))
    {
        return true;
    }

    var charactersDirectory = Path.Combine(libraryDirectory, "characters");
    return Directory.Exists(charactersDirectory)
        && Directory.EnumerateFiles(charactersDirectory, "character.json", SearchOption.AllDirectories).Any();
}

internal static partial class NativeMethods
{
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    internal static extern int MessageBox(IntPtr hWnd, string text, string caption, uint type);
}
