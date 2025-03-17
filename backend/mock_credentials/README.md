# Mock Credentials

This directory contains template files for mock credentials used in development and testing.

## Usage

1. Copy the template file to a new file with the format `{user_id}_{provider}.json`
2. Replace the placeholder values with your test credentials
3. **IMPORTANT**: Never commit real credentials to the repository

## Example

```bash
cp template_google.json your_user_id_google.json
# Edit the file with your test credentials
```

The mock credentials are used by the application when running in development mode. 