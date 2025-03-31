import axios from 'axios';
const baseURL = 'http://localhost:5000';

// We'll use this cookie container to maintain our session
const cookieJar = {};

// Utility function to extract and save cookies
const saveCookies = (headers) => {
  const setCookie = headers['set-cookie'];
  if (setCookie && setCookie.length) {
    setCookie.forEach(cookie => {
      const [cookieMain] = cookie.split(';');
      const [key, value] = cookieMain.split('=');
      cookieJar[key] = value;
    });
  }
};

// Add cookies to the request
const getCookieHeader = () => {
  return Object.entries(cookieJar)
    .map(([key, value]) => `${key}=${value}`)
    .join('; ');
};

// Login to get authenticated
async function login() {
  try {
    const response = await axios.post(`${baseURL}/api/auth/login`, {
      email: 'yair.sakols+9@gmail.com',
      password: 'password123'
    }, {
      withCredentials: true
    });
    
    saveCookies(response.headers);
    console.log('Login successful');
    return response.data;
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
    throw error;
  }
}

// Get the current authenticated user
async function getAuthenticatedUser() {
  try {
    const response = await axios.get(`${baseURL}/api/auth/me`, {
      headers: {
        Cookie: getCookieHeader()
      }
    });
    
    console.log('Current user:', response.data);
    return response.data;
  } catch (error) {
    console.error('Failed to get authenticated user:', error.response?.data || error.message);
    throw error;
  }
}

// Find inconsistent transactions
async function findInconsistentTransactions() {
  try {
    const response = await axios.get(`${baseURL}/api/admin/transactions/inconsistencies`, {
      headers: {
        Cookie: getCookieHeader()
      }
    });
    
    console.log('Inconsistent transactions:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('Failed to find inconsistent transactions:', error.response?.data || error.message);
    throw error;
  }
}

// Verify a specific transaction
async function verifyTransaction(transactionId) {
  try {
    const response = await axios.get(`${baseURL}/api/admin/transactions/${transactionId}/verify`, {
      headers: {
        Cookie: getCookieHeader()
      }
    });
    
    console.log(`Transaction ${transactionId} verification:`, JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error(`Failed to verify transaction ${transactionId}:`, error.response?.data || error.message);
    throw error;
  }
}

// Fix a specific transaction
async function reconcileTransaction(transactionId) {
  try {
    const response = await axios.post(`${baseURL}/api/admin/transactions/${transactionId}/reconcile`, {}, {
      headers: {
        Cookie: getCookieHeader()
      }
    });
    
    console.log(`Transaction ${transactionId} reconciled:`, JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error(`Failed to reconcile transaction ${transactionId}:`, error.response?.data || error.message);
    throw error;
  }
}

// Fix all inconsistent transactions
async function reconcileAllTransactions() {
  try {
    const response = await axios.post(`${baseURL}/api/admin/transactions/reconcile-all`, {}, {
      headers: {
        Cookie: getCookieHeader()
      }
    });
    
    console.log('All transactions reconciled:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('Failed to reconcile all transactions:', error.response?.data || error.message);
    throw error;
  }
}

// Run the tests
async function runTests() {
  try {
    await login();
    await getAuthenticatedUser();
    
    // Find all inconsistent transactions
    const inconsistencies = await findInconsistentTransactions();
    
    // If there are any inconsistent transactions, verify and fix the first one
    if (inconsistencies.count > 0) {
      const firstTransactionId = inconsistencies.inconsistencies[0].transactionId;
      await verifyTransaction(firstTransactionId);
      await reconcileTransaction(firstTransactionId);
    }
    
    // Fix all inconsistent transactions
    await reconcileAllTransactions();
    
    // Verify that there are no more inconsistencies
    const afterFix = await findInconsistentTransactions();
    console.log(`After fixing: ${afterFix.count} inconsistencies remaining`);
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the tests
runTests();