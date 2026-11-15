; ============================================================
;  OneGitVault — Inno Setup Script
;  Auto-configured for seamless upgrades, version tracking,
;  and custom amber vault branding.
; ============================================================

#ifndef AppVersion
  #define AppVersion "1.0.1"
#endif

#define AppName      "OneGitVault"
#define AppPublisher "VKaddala"
#define AppURL       "https://github.com/VKaddala/OneGitVault"
#define AppExeName   "OneGitVault.exe"
#define SourceDir    "release\OneGitVault-win32-x64"

[Setup]
AppId={{A1B2C3D4-E5F6-7890-ABCD-EF1234567890}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
AppPublisherURL={#AppURL}
AppSupportURL={#AppURL}
AppUpdatesURL={#AppURL}
DefaultDirName={autopf}\{#AppName}
DefaultGroupName={#AppName}
AllowNoIcons=yes
OutputDir=release\setup
OutputBaseFilename=OneGitVault-Setup-{#AppVersion}
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
DisableProgramGroupPage=yes
UsePreviousAppDir=yes
CloseApplications=yes
CloseApplicationsFilter=*.exe,{#AppExeName}
RestartApplications=no
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
SetupIconFile=assets\icons\onegitvault.ico
UninstallDisplayName={#AppName}
UninstallDisplayIcon={app}\app.ico
ChangesAssociations=yes
ShowLanguageDialog=no

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: checkedonce

[InstallDelete]
; Clean out previous application bundle to prevent stale cache on upgrade
Type: filesandordirs; Name: "{app}\resources\app\dist"
Type: files; Name: "{autodesktop}\{#AppName}.lnk"
Type: files; Name: "{userdesktop}\{#AppName}.lnk"
Type: files; Name: "{commondesktop}\{#AppName}.lnk"
Type: files; Name: "{group}\{#AppName}.lnk"

[Files]
; Copy dedicated ICO icon file directly to root so Windows shortcut icon cache binds directly
Source: "assets\icons\onegitvault.ico"; DestDir: "{app}"; DestName: "app.ico"; Flags: ignoreversion
; Copy all files from the updated build directory, overwriting any previous version
Source: "{#SourceDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
; Start Menu shortcut
Name: "{group}\{#AppName}"; Filename: "{app}\{#AppExeName}"; IconFilename: "{app}\app.ico"
Name: "{group}\Uninstall {#AppName}"; Filename: "{uninstallexe}"
; Desktop shortcut (optional, based on task)
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\{#AppExeName}"; IconFilename: "{app}\app.ico"; Tasks: desktopicon

[Run]
; Offer to launch the app after install
Filename: "{app}\{#AppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(AppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
Type: filesandordirs; Name: "{app}"
