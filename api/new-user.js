// Global user store - shared across function invocations in the same deployment
global.users = global.users || [];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Only POST allowed' });
    return;
  }

  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ message: 'Missing username or password' });
    return;
  }

  // Check if user already exists
  const userExists = global.users.find(user => user.username === username);
  if (userExists) {
    res.status(409).json({ message: 'Username already taken' });
    return;
  }

  // Store the new user
  global.users.push({ username, password });

  res.status(200).json({ message: 'User registered successfully!' });
}