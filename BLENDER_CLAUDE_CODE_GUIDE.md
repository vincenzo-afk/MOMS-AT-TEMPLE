# How to Connect Blender with Claude Code (Every Time)

This guide covers everything you need to know to launch and connect Blender with **Claude Code** whenever you work.

---

## 1. Quick Start (Standard Workflow)

Whenever you want to use Claude Code to control Blender:

### Step 1: Open Blender
You can open Blender in either of these ways:
- **Terminal**: Run `blender` in any terminal or command prompt.
- **Desktop**: Double-click the **Blender** shortcut on your Desktop or Start Menu.

### Step 2: Start the MCP Server in Blender
1. In the **3D Viewport** (main window), press **`N`** on your keyboard to expand the right sidebar panel (if it isn't already visible).
2. Look at the vertical tabs on the right edge and click **MCP for Blender**.
3. Click the blue button labeled **"Connect to Claude"**.
   - It will turn into a green checkmark: `Connected on port 9876`.
   - *(Optional Tip)*: Check the **"Auto-Start Server"** checkbox in that panel so Blender starts the server automatically whenever you open Blender!

### Step 3: Run Claude Code
Open your terminal (PowerShell, Command Prompt, or VS Code terminal) in your project directory and start Claude Code:
```bash
claude
```

Claude Code will automatically detect the `blender` MCP server configured in your `~/.claude.json`.

### Step 4: Give Claude Instructions
Type your prompt in Claude Code:
- *"Create a low-poly tree with green leaves and a brown trunk in the current Blender scene."*
- *"Select the active cube and apply a metallic blue shader to it."*
- *"List all the objects currently in the Blender scene."*

---

## 2. Configuration Reference (Already Configured)

You do **not** need to repeat these steps, but here is what is configured behind the scenes:

1. **Blender Command**:
   - Location: `D:\Blender\blender.exe`
   - Global launcher: `C:\Users\Vincenzo\.local\bin\blender.cmd` (allows typing `blender` in any terminal).
2. **Blender MCP Add-on**:
   - Add-on file: `C:\Users\Vincenzo\AppData\Roaming\Blender Foundation\Blender\5.2\scripts\addons\blender_mcp.py`
   - Status: Enabled and saved in your default Blender preferences.
3. **Claude Code Configuration**:
   - Stored in `C:\Users\Vincenzo\.claude.json`:
   ```json
   "mcpServers": {
     "blender": {
       "command": "C:\\Users\\Vincenzo\\.local\\bin\\uvx.exe",
       "args": ["mcp-for-blender"]
     }
   }
   ```
4. **Claude Desktop Configuration**:
   - Stored in `C:\Users\Vincenzo\AppData\Roaming\Claude\claude_desktop_config.json` with the same `blender` server block.

---

## 3. Troubleshooting & Verification

| Issue | Solution |
| :--- | :--- |
| `blender` command not found | Open a fresh terminal tab/window so the updated PATH is recognized. |
| Cannot see "MCP for Blender" tab | In 3D Viewport, press **`N`**. If still missing, go to `Edit > Preferences > Add-ons`, search for `MCP for Blender`, and ensure the checkbox is checked. |
| Claude says "Cannot connect to Blender" | Ensure Blender is currently running and you clicked **"Connect to Claude"** in the sidebar. |
| Port conflict | The default socket port is `9876`. If busy, you can change the port in Blender's MCP tab and pass `--port <new_port>` in `.claude.json`. |
