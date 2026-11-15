; ============================================================
;  OneGitVault — Inno Setup Script
;  Auto-configured for seamless upgrades, version tracking,
;  and custom amber vault branding.
; ============================================================

#ifndef AppVersion
  #define AppVersion "1.0.4"
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
DirExistsWarning=no
CloseApplications=force
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
; Completely wipe old resources and package files to ensure 100% clean replacement
Type: filesandordirs; Name: "{app}\resources\app"
Type: filesandordirs; Name: "{app}\locales"
Type: files; Name: "{app}\*.pak"
Type: files; Name: "{app}\*.dll"
Type: files; Name: "{app}\*.bin"
Type: files; Name: "{app}\*.dat"
Type: files; Name: "{app}\{#AppExeName}"
Type: files; Name: "{app}\app.ico"
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

[Code]
// Helper function to extract and run any previous uninstaller silently before upgrade
function GetUninstallString(): String;
var
  sUnInstPath: String;
  sUnInstallString: String;
begin
  sUnInstPath := ExpandConstant('Software\Microsoft\Windows\CurrentVersion\Uninstall\{#emit SetupSetting("AppId")}_is1');
  sUnInstallString := '';
  if not RegQueryStringValue(HKLM, sUnInstPath, 'UninstallString', sUnInstallString) then
    if not RegQueryStringValue(HKCU, sUnInstPath, 'UninstallString', sUnInstallString) then
      RegQueryStringValue(HKLM64, sUnInstPath, 'UninstallString', sUnInstallString);
  Result := sUnInstallString;
end;

function UnQuoteString(S: String): String;
begin
  if (Length(S) >= 2) and (S[1] = '"') and (S[Length(S)] = '"') then
    Result := Copy(S, 2, Length(S) - 2)
  else
    Result := S;
end;

function PrepareToInstall(var NeedsRestart: Boolean): String;
var
  sUnInstallString: String;
  iResultCode: Integer;
begin
  sUnInstallString := GetUninstallString();
  if sUnInstallString <> '' then
  begin
    sUnInstallString := UnQuoteString(sUnInstallString);
    if FileExists(sUnInstallString) then
    begin
      Exec(sUnInstallString, '/SILENT /VERYSILENT /SUPPRESSMSGBOXES /NORESTART', '', SW_HIDE, ewWaitUntilTerminated, iResultCode);
    end;
  end;
  Result := '';
end;
