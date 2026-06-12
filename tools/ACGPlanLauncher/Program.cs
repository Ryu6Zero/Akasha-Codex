using System.Diagnostics;

var executableDirectory = AppContext.BaseDirectory;
var targetExecutable = Path.Combine(executableDirectory, "win-unpacked", "绯典阁.exe");

if (!File.Exists(targetExecutable))
{
    NativeMethods.MessageBox(IntPtr.Zero, $"Cannot find {targetExecutable}", "绯典阁", 0x10);
    return 1;
}

using var process = Process.Start(new ProcessStartInfo
{
    FileName = targetExecutable,
    WorkingDirectory = Path.GetDirectoryName(targetExecutable) ?? executableDirectory,
    UseShellExecute = false,
});

process?.WaitForExit();
return process?.ExitCode ?? 0;

internal static partial class NativeMethods
{
    [System.Runtime.InteropServices.DllImport("user32.dll", CharSet = System.Runtime.InteropServices.CharSet.Unicode)]
    internal static extern int MessageBox(IntPtr hWnd, string text, string caption, uint type);
}
