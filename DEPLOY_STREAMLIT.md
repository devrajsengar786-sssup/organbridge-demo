# Streamlit Community Cloud

Repository: devrajsengar786-sssup/organbridge-demo
Branch: main
Entrypoint: streamlit_app.py
Python: 3.11 or newer

The Streamlit wrapper preserves the existing OrganBridge JavaScript interface and runs the Node API on a loopback-only port. packages.txt installs Node.js. Python proxies component API requests using a separate server-side cookie jar for each Streamlit browser session. API credentials and cookies are never exposed in component arguments. Synthetic datasets remain isolated by session and temporary.

Set a private Streamlit secret before deployment:

```toml
ORGANBRIDGE_ACCOUNTS_JSON = '''
<paste the JSON contents of your local data/auth-accounts.json here>
'''
```

Never commit secrets.toml or LOGIN-CREDENTIALS.txt. Existing local staff/admin passwords work when their corresponding hashes are supplied as the secret. Without the secret, cloud startup generates ephemeral accounts whose passwords cannot be retrieved from the public app.

Deploy from the existing GitHub repository in Streamlit Community Cloud. Choose Advanced settings and enter the secret, then Deploy. No real medical records should be entered. Visitor email remains unverified. Hospital lists are public directory snapshots, not live organ availability.

Local test: python -m streamlit run streamlit_app.py. Node.js must be installed locally. The original npm start workflow remains available.
