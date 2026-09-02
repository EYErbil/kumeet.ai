param(
    [Parameter(Mandatory = $false)]
    [string]$Path = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = "Stop"
$repositoryRoot = (Resolve-Path -LiteralPath $Path).Path
$findings = [System.Collections.Generic.List[object]]::new()

$ignoredDirectories = @(
    ".git",
    "node_modules",
    ".venv",
    "venv",
    "__pycache__",
    "build",
    "dist",
    "coverage"
)

$forbiddenFilePatterns = @(
    "^\.env($|\.(?!example$).+)",
    "^id_ed25519(\.pub)?$",
    "^id_rsa(\.pub)?$",
    "^known_hosts$",
    "^firebase-service-account.*\.json$",
    "^firebase-credentials.*\.json$",
    "^credentials.*\.json$",
    "^client_secret.*\.json$",
    "^\.npmrc$",
    "^\.pypirc$",
    "^\.envrc$",
    "\.(pem|key|p12|pfx|jks|keystore|tfstate)$",
    "\.(db|sqlite|sqlite3)$",
    "\.(wav|mp3|m4a|aac|ogg|flac|mp4|mov|mkv|avi|webm|mpeg|mpg|wmv)$",
    "\.(zip|7z|rar|tar|tgz|gz)$",
    "^\.DS_Store$"
)

$secretPatterns = [ordered]@{
    "Hugging Face token" = "hf_[A-Za-z0-9_-]{20,}"
    "Google API key" = "AIza[A-Za-z0-9_-]{25,}"
    "Private key block" = "-----BEGIN (OPENSSH|RSA|EC|DSA|PRIVATE) PRIVATE KEY-----"
    "GitHub token" = "(github_pat_|gh[pousr]_)[A-Za-z0-9_]{20,}"
    "GitLab token" = "glpat-[A-Za-z0-9_-]{20,}"
    "Google OAuth client secret" = "GOCSPX-[A-Za-z0-9_-]{20,}"
    "Slack token" = "xox[baprs]-[A-Za-z0-9-]{20,}"
    "Stripe live secret" = "sk_live_[A-Za-z0-9]{20,}"
    "SSH public key" = "ssh-(rsa|ed25519|ecdsa-[^ ]+) [A-Za-z0-9+/]{80,}={0,3}"
    "AWS access key" = "AKIA[0-9A-Z]{16}"
    "OpenAI-style token" = "sk-[A-Za-z0-9_-]{20,}"
    "Service-account private key" = '"private_key"\s*:\s*"-----BEGIN'
}

$textExtensions = @(
    ".cfg", ".conf", ".css", ".env", ".example", ".html", ".ini", ".js",
    ".json", ".jsx", ".md", ".properties", ".ps1", ".py", ".sh", ".toml",
    ".ts", ".tsx", ".txt", ".xml", ".yaml", ".yml"
)

$files = Get-ChildItem -LiteralPath $repositoryRoot -Recurse -Force -File |
    Where-Object {
        $relative = $_.FullName.Substring($repositoryRoot.Length + 1)
        $segments = $relative -split '[\\/]'
        -not ($segments | Where-Object { $ignoredDirectories -contains $_ })
    }

foreach ($file in $files) {
    $relativePath = $file.FullName.Substring($repositoryRoot.Length + 1)
    $relativeSegments = $relativePath -split '[\\/]'

    if ($relativeSegments -contains "mock_credentials") {
        $findings.Add([pscustomobject]@{
            Kind = "Forbidden credential directory"
            Path = $relativePath
            Rule = "mock_credentials"
        })
    }

    foreach ($pattern in $forbiddenFilePatterns) {
        if ($file.Name -match $pattern) {
            $findings.Add([pscustomobject]@{
                Kind = "Forbidden file"
                Path = $relativePath
                Rule = $pattern
            })
        }
    }

    if ($textExtensions -notcontains $file.Extension -and $file.Name -notlike ".env*") {
        continue
    }

    foreach ($entry in $secretPatterns.GetEnumerator()) {
        if (Select-String -LiteralPath $file.FullName -Pattern $entry.Value -Quiet) {
            $findings.Add([pscustomobject]@{
                Kind = "Secret pattern"
                Path = $relativePath
                Rule = $entry.Key
            })
        }
    }
}

if ($findings.Count -gt 0) {
    Write-Host "Public-release check failed. Values are intentionally redacted." -ForegroundColor Red
    $findings | Sort-Object Kind, Path, Rule | Format-Table -AutoSize
    exit 1
}

Write-Host "Public-release check passed: no forbidden files or known secret patterns found." -ForegroundColor Green
exit 0
