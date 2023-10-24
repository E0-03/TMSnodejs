const mysql = require("mysql2");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

// Database configuration
const dbConfig = {
  host: "localhost",
  port: 3306,
  database: "nodelogin",
  user: "root",
  password: "freefrag",
};

// Create a MySQL connection pool
const pool = mysql.createPool(dbConfig);

// Function to compare the provided password with the hashed password
function comparePasswords(password, hashedPassword) {
  return bcrypt.compareSync(password, hashedPassword);
}

// Login function
function login(req, res) {
  const username = req.body.username;
  const password = req.body.password;

  // Check if username and password are not empty
  if (!username || !password) {
    res.json({ error: "Username and/or password is wrong" });
    return;
  }

  // Check the username against the database
  pool.execute(
    "SELECT * FROM userdetails WHERE username = ?",
    [username],
    (err, results) => {
      if (err) {
        console.error("Error executing the query:", err);
        res.json({ error: "Internal server error" });
        return;
      }

      if (results.length < 1) {
        res.json({ error: "Username and/or password is wrong" });
        return;
      }

      const userStatus = results[0].status;
      const hashedPassword = results[0].password;

      // Compare the entered password with the hashed password
      if (!comparePasswords(password, hashedPassword)) {
        res.json({ error: "Username and/or password is wrong" });
        return;
      }

      if (userStatus !== 1) {
        res.json({ error: "Account is disabled" });
        return;
      }

      // Create a JWT token with the username
      const token = jwt.sign({ username }, process.env.YOUR_SECRET_KEY);

      // Store the username in the session
      req.session.isLoggedIn = true;
      req.session.username = username;

      // Return the JWT token in the response
      res.json({ error: null, response: "success", token });
    }
  );
}

// Log out function
function logout(req, res) {
  // Set isLoggedIn to false to log the user out
  req.session.isLoggedIn = false;

  res.json({ logout: "You are logged out" });
}

// is active function
function isActive(req, res) {
  // Verify the JWT token
  const token = req.body.token;
  if (!token) {
    res.json({ error: "No token provided" });
    return;
  }

  try {
    // Verify and decode the token to get the username
    const decoded = jwt.verify(token, process.env.YOUR_SECRET_KEY);
    const username = decoded.username;

    // Check the username against the database to get the user status
    pool.execute(
      "SELECT status FROM userdetails WHERE username = ?",
      [username],
      (err, results) => {
        if (err) {
          console.error("Error executing the query:", err);
          res.status(500).json({ error: "Internal server error" });
          return;
        }

        if (results.length < 1) {
          res.status(404).json({ error: "User not found" });
          return;
        }

        const userStatus = results[0].status;

        // Return the user status in the response along with 'response'
        res.json({ error: null, response: "success", status: userStatus });
      }
    );
  } catch (error) {
    console.error("Error decoding token:", error);
    res.status(401).json({ error: "Invalid token" });
  }
}

module.exports = { login, logout, isActive };
