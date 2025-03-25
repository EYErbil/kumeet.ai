// Add this file to your frontend project
// This will help debug API communication issues

// Function to test API connectivity
async function testApiConnections() {
  const apiUrls = [
    'http://localhost:8000/api/meetings',
    'http://backend:8000/api/meetings',
    `http://${window.location.hostname}:8000/api/meetings`
  ];

  console.log('Testing API connections...');

  for (const url of apiUrls) {
    try {
      console.log(`Trying: ${url}`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`SUCCESS with ${url}:`, data);
      } else {
        console.log(`FAILED with ${url}: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.log(`ERROR with ${url}:`, error.message);
    }
  }

  console.log('API testing complete');
}

// Add a button to the page to run the test
function addDebugButton() {
  const button = document.createElement('button');
  button.innerText = 'Test API Connections';
  button.style.position = 'fixed';
  button.style.bottom = '10px';
  button.style.right = '10px';
  button.style.zIndex = '9999';
  button.style.padding = '8px 16px';
  button.style.backgroundColor = '#f44336';
  button.style.color = 'white';
  button.style.border = 'none';
  button.style.borderRadius = '4px';
  button.style.cursor = 'pointer';

  button.onclick = testApiConnections;

  document.body.appendChild(button);
  console.log('Debug button added to page');
}

// Execute when the page loads
window.addEventListener('load', addDebugButton);

// Log the current host
console.log('Current location:', window.location.href);
console.log('Hostname:', window.location.hostname);