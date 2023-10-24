const mysql = require("mysql2");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const checkGroup = require("./checkgroup").checkGroup;

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

// bcrypt
// Function to generate a salt and hash the password

function hashPassword(password) {
  const saltRounds = 10; // Number of salt rounds (the higher, the more secure but slower)
  return bcrypt.hashSync(password, saltRounds);
}

// Create New User function
async function createnewuser(req, res) {
  // Verify the JWT token
  const token = req.body.token;
  if (!token) {
    res.json({ error: "No token provided" });
    return;
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.YOUR_SECRET_KEY);
    // The decoded object contains the username if the token is valid
    // You can use decoded.username for further processing if needed
  } catch (err) {
    res.json({ error: "Invalid token" });
    return;
  }

  // Check if the user is an admin
  const userId = decoded.username;
  const groupName = "admin";

  try {
    const isAdmin = await checkGroup(userId, groupName);
    if (!isAdmin) {
      res.json({ error: "You do not have access to this resource!" });
      return;
    }
  } catch (err) {
    console.error("Error checking group:", err);
    res.json({ error: "Error checking group" });
    return;
  }

  // Check if the user is logged in
  /*if (!req.session.isLoggedIn) {
    res.json({ error: "You are logged out!" });
    return;
  }*/

  // Check if username is alphanumeric, no special characters or spaces, 3-12 characters long
  const usernameRegex = /^[a-zA-Z0-9]{3,12}$/;
  if (!usernameRegex.test(req.body.username)) {
    res.json({ error: "Username is invalid" });
    return;
  }

  const { username, email, password, usergroup, status } = req.body;

  // Check if username or email already exists in the database
  pool.execute(
    "SELECT * FROM userdetails WHERE username = ?",
    [username],
    async (err, results) => {
      if (err) {
        console.error("Error executing the query:", err);
        res.json({ error: "Internal server error" });
        return;
      }

      if (results.length > 0) {
        // Check if username exists
        if (results.some((user) => user.username === username)) {
          res.json({ error: "Username is in use" });
          return;
        }
      }

      // Validate password and email
      const passwordRegex =
        /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,10}$/;

      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        res.json({ error: "Email is invalid" });
        return;
      }

      if (!passwordRegex.test(password)) {
        res.json({ error: "Password is invalid" });
        return;
      }

      // Hash the password before storing in the database
      const hashedPassword = await hashPassword(password);

      // Insert the new user into the database with the hashed password
      pool.execute(
        "INSERT INTO userdetails (username, email, password, usergroup, status) VALUES (?, ?, ?, ?, ?)",
        [username, email || null, hashedPassword, usergroup || null, status],
        (err, result) => {
          if (err) {
            console.error("Error executing the query:", err);
            res.json({ error: "Internal server error" });
            return;
          }

          res.json({ error: null, response: "success" });
        }
      );
    }
  );
}

// Change Password function
async function changepassword(req, res) {
  // Verify the JWT token
  const token = req.body.token;
  if (!token) {
    res.json({ error: "No token provided" });
    return;
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.YOUR_SECRET_KEY);
    // The decoded object contains the username if the token is valid
    // You can use decoded.username for further processing if needed
  } catch (err) {
    res.json({ error: "Invalid token" });
    return;
  }

  // Check if the user is an admin
  const userId = decoded.username;
  const groupName = "admin";

  try {
    const isAdmin = await checkGroup(userId, groupName);
    if (!isAdmin) {
      res.json({ error: "You do not have access to this resource!" });
      return;
    }
  } catch (err) {
    console.error("Error checking group:", err);
    res.json({ error: "Error checking group" });
    return;
  }

  // Check if the user is logged in
  /*if (!req.session.isLoggedIn) {
    return res.json({ error: "You are logged out!" });
  }*/

  const { username, newPassword } = req.body;

  // Validate the new password
  const passwordRegex =
    /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,10}$/;
  if (!passwordRegex.test(newPassword)) {
    res.json({ error: "Password is invalid" });
    return;
  }

  // Hash the new password
  const hashedPassword = hashPassword(newPassword);

  // Check if the username exists in the database
  pool.execute(
    "SELECT * FROM userdetails WHERE username = ?",
    [username],
    (err, results) => {
      if (err) {
        console.error("Error executing the query:", err);
        res.json({ error: "Internal server error" });
        return;
      }

      if (results.length === 0) {
        res.json({ error: "Username does not exist!" });
        return;
      }

      // Update the password for the given username with the hashed password
      pool.execute(
        "UPDATE userdetails SET password = ? WHERE username = ?",
        [hashedPassword, username],
        (err, result) => {
          if (err) {
            console.error("Error executing the query:", err);
            res.json({ error: "Internal server error" });
            return;
          }

          res.json({ error: null, response: "success" });
        }
      );
    }
  );
}

// Change Email function
async function changeemail(req, res) {
  // Verify the JWT token
  const token = req.body.token;
  if (!token) {
    res.json({ error: "No token provided" });
    return;
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.YOUR_SECRET_KEY);
    // The decoded object contains the username if the token is valid
    // You can use decoded.username for further processing if needed
  } catch (err) {
    res.json({ error: "Invalid token" });
    return;
  }

  // Check if the user is an admin
  const userId = decoded.username;
  const groupName = "admin";

  try {
    const isAdmin = await checkGroup(userId, groupName);
    if (!isAdmin) {
      res.json({ error: "You do not have access to this resource!" });
      return;
    }
  } catch (err) {
    console.error("Error checking group:", err);
    res.json({ error: "Error checking group" });
    return;
  }

  // Check if the user is logged in
  /*if (!req.session.isLoggedIn) {
    return res.json({ error: "You are logged out!" });
  }*/

  const { username, newEmail } = req.body;

  // Validate the new email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(newEmail)) {
    return res.json({ error: "Email is invalid" });
  }

  // Check if the username exists in the database
  pool.execute(
    "SELECT * FROM userdetails WHERE username = ?",
    [username],
    (err, results) => {
      if (err) {
        console.error("Error executing the query:", err);
        return res.json({ error: "Internal server error" });
      }

      if (results.length === 0) {
        return res.json({ error: "Username does not exist!" });
      }

      // Update the email for the given username
      pool.execute(
        "UPDATE userdetails SET email = ? WHERE username = ?",
        [newEmail, username],
        (err, result) => {
          if (err) {
            console.error("Error executing the query:", err);
            return res.json({ error: "Internal server error" });
          }

          res.json({ error: null, response: "success" });
        }
      );
    }
  );
}

// Change Group Function
async function changegroup(req, res) {
  // Verify the JWT token
  const token = req.body.token;
  if (!token) {
    res.json({ error: "No token provided" });
    return;
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.YOUR_SECRET_KEY);
    // The decoded object contains the username if the token is valid
    // You can use decoded.username for further processing if needed
  } catch (err) {
    res.json({ error: "Invalid token" });
    return;
  }

  // Check if the user is an admin
  const userId = decoded.username;
  const groupName = "admin";

  try {
    const isAdmin = await checkGroup(userId, groupName);
    if (!isAdmin) {
      res.json({ error: "You do not have access to this resource!" });
      return;
    }
  } catch (err) {
    console.error("Error checking group:", err);
    res.json({ error: "Error checking group" });
    return;
  }

  // Check if the user is logged in
  /*if (!req.session.isLoggedIn) {
    return res.json({ error: "You are logged out!" });
  }*/

  const { username, newUserGroup } = req.body;

  if (!newUserGroup) {
    return res.json({ error: "newUserGroup is empty" });
  }

  // Check if the username exists in the database
  pool.execute(
    "SELECT * FROM userdetails WHERE username = ?",
    [username],
    (err, results) => {
      if (err) {
        console.error("Error executing the query:", err);
        return res.json({ error: "Internal server error" });
      }

      if (results.length === 0) {
        return res.json({ error: "Username does not exist!" });
      }

      // Update the user group for the given username
      pool.execute(
        "UPDATE userdetails SET usergroup = ? WHERE username = ?",
        [newUserGroup, username],
        (err, result) => {
          if (err) {
            console.error("Error executing the query:", err);
            return res.json({ error: "Internal server error" });
          }

          res.json({ error: null, response: "success" });
        }
      );
    }
  );
}

// Change Status function
async function changestatus(req, res) {
  // Verify the JWT token
  const token = req.body.token;
  if (!token) {
    res.json({ error: "No token provided" });
    return;
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.YOUR_SECRET_KEY);
    // The decoded object contains the username if the token is valid
    // You can use decoded.username for further processing if needed
  } catch (err) {
    res.json({ error: "Invalid token" });
    return;
  }

  // Check if the user is an admin
  const userId = decoded.username;
  const groupName = "admin";

  try {
    const isAdmin = await checkGroup(userId, groupName);
    if (!isAdmin) {
      res.json({ error: "You do not have access to this resource!" });
      return;
    }
  } catch (err) {
    console.error("Error checking group:", err);
    res.json({ error: "Error checking group" });
    return;
  }

  // Check if the user is logged in
  /*if (!req.session.isLoggedIn) {
    return res.json({ error: "You are logged out!" });
  }*/

  const { username, newStatus } = req.body;

  // Validate the new status
  if (newStatus != 0 && newStatus != 1) {
    return res.json({ error: "Status is invalid" });
  }

  // Check if the username exists in the database
  pool.execute(
    "SELECT * FROM userdetails WHERE username = ?",
    [username],
    (err, results) => {
      if (err) {
        console.error("Error executing the query:", err);
        return res.json({ error: "Internal server error" });
      }

      if (results.length === 0) {
        return res.json({ error: "Username does not exist!" });
      }

      // Update the status for the given username
      pool.execute(
        "UPDATE userdetails SET status = ? WHERE username = ?",
        [newStatus, username],
        (err, result) => {
          if (err) {
            console.error("Error executing the query:", err);
            return res.json({ error: "Internal server error" });
          }

          res.json({ error: null, response: "success" });
        }
      );
    }
  );
}

// Get groups function
async function getgroups(req, res) {
  // Verify the JWT token
  const token = req.body.token;
  if (!token) {
    res.json({ error: "No token provided" });
    return;
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.YOUR_SECRET_KEY);
    // The decoded object contains the username if the token is valid
    // You can use decoded.username for further processing if needed
  } catch (err) {
    res.json({ error: "Invalid token" });
    return;
  }

  // Check if the user is an admin
  // const userId = decoded.username;
  // const groupName = "admin";

  // try {
  //   const isAdmin = await checkGroup(userId, groupName);
  //   if (!isAdmin) {
  //     res.json({ error: "You do not have access to this resource!" });
  //     return;
  //   }
  // } catch (err) {
  //   console.error("Error checking group:", err);
  //   res.json({ error: "Error checking group" });
  //   return;
  // }

  // Check if the user is logged in
  /*if (!req.session.isLoggedIn) {
    return res.json({ error: "You are logged out!" });
  }*/

  // Fetch all the groups from the usergroup table
  pool.execute("SELECT usergroups FROM usergroup", (err, results) => {
    if (err) {
      console.error("Error executing the query:", err);
      return res.json({ error: "Internal server error" });
    }

    // Extract the list of groups from the results
    const groupsList = results.map((group) => group.usergroups);

    res.json({ error: null, groups: groupsList });
  });
}

// Create Group function
async function creategroup(req, res) {
  // Verify the JWT token
  const token = req.body.token;
  if (!token) {
    res.json({ error: "No token provided" });
    return;
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.YOUR_SECRET_KEY);
    // The decoded object contains the username if the token is valid
    // You can use decoded.username for further processing if needed
  } catch (err) {
    res.json({ error: "Invalid token" });
    return;
  }

  // Check if the user is an admin
  const userId = decoded.username;
  const groupName = "admin";

  // console.log(userId);

  try {
    const isAdmin = await checkGroup(userId, groupName);
    if (!isAdmin) {
      res.json({ error: "You do not have access to this resource!" });
      return;
    }
  } catch (err) {
    console.error("Error checking group:", err);
    res.json({ error: "Error checking group" });
    return;
  }

  // Check if the user is logged in
  /*if (!req.session.isLoggedIn) {
    return res.json({ error: "You are logged out!" });
  }*/

  const newUserGroup = req.body.usergroup;

  // Check if the new user group is provided
  if (!newUserGroup) {
    return res.json({ error: "Please provide a new user group!" });
  }

  // Check if the new user group already exists in the usergroup table
  pool.execute(
    "SELECT * FROM usergroup WHERE usergroups = ?",
    [newUserGroup],
    (err, results) => {
      if (err) {
        console.error("Error executing the query:", err);
        return res.json({ error: "Internal server error" });
      }

      if (results.length > 0) {
        return res.json({ error: "User group already exists!" });
      }

      // Add the new user group to the usergroup table
      pool.execute(
        "INSERT INTO usergroup (usergroups) VALUES (?)",
        [newUserGroup],
        (err) => {
          if (err) {
            console.error("Error executing the query:", err);
            return res.json({ error: "Internal server error" });
          }

          res.json({ error: null, response: "success" });
        }
      );
    }
  );
}

// Function to retrieve user details from the database
async function getUserDetails(req, res) {
  // Verify the JWT token
  const token = req.body.token;
  if (!token) {
    res.json({ error: "No token provided" });
    return;
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.YOUR_SECRET_KEY);
    // The decoded object contains the username if the token is valid
    // You can use decoded.username for further processing if needed
  } catch (err) {
    res.json({ error: "Invalid token" });
    return;
  }

  // Check if the user is an admin
  const userId = decoded.username;
  const groupName = "admin";

  try {
    const isAdmin = await checkGroup(userId, groupName);
    if (!isAdmin) {
      res.json({ error: "You do not have access to this resource!" });
      return;
    }
  } catch (err) {
    console.error("Error checking group:", err);
    res.json({ error: "Error checking group" });
    return;
  }
  try {
    // Query the userdetails table for the specified columns using pool.execute()
    const query = "SELECT username, email, usergroup, status FROM userdetails";
    const [rows] = await pool.promise().execute(query);

    // Send the retrieved rows as a response to the client
    res.json({ data: rows });
  } catch (error) {
    // Handle any errors that occur during the database operation
    console.error("Error retrieving user details:", error);
    res.json({ error: "Error retrieving user details" });
  }
}

// Change Password function
async function changepasswordcommon(req, res) {
  // Verify the JWT token
  const token = req.body.token;
  if (!token) {
    res.json({ error: "No token provided" });
    return;
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.YOUR_SECRET_KEY);
    // The decoded object contains the username if the token is valid
    // You can use decoded.username for further processing if needed
  } catch (err) {
    res.json({ error: "Invalid token" });
    return;
  }

  // Check if the user is an admin
  /*const userId = decoded.username;
  const groupName = "admin";

  try {
    const isAdmin = await checkGroup(userId, groupName);
    if (!isAdmin) {
      res.json({ error: "You do not have access to this resource!" });
      return;
    }
  } catch (err) {
    console.error("Error checking group:", err);
    res.json({ error: "Error checking group" });
    return;
  }

  // Check if the user is logged in
  if (!req.session.isLoggedIn) {
    return res.json({ error: "You are logged out!" });
  }*/

  const { username, newPassword } = req.body;

  // Validate the new password
  const passwordRegex =
    /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,10}$/;
  if (!passwordRegex.test(newPassword)) {
    res.json({ error: "Password is invalid" });
    return;
  }

  // Hash the new password
  const hashedPassword = hashPassword(newPassword);

  // Check if the username exists in the database
  pool.execute(
    "SELECT * FROM userdetails WHERE username = ?",
    [username],
    (err, results) => {
      if (err) {
        console.error("Error executing the query:", err);
        res.json({ error: "Internal server error" });
        return;
      }

      if (results.length === 0) {
        res.json({ error: "Username does not exist!" });
        return;
      }

      // Update the password for the given username with the hashed password
      pool.execute(
        "UPDATE userdetails SET password = ? WHERE username = ?",
        [hashedPassword, username],
        (err, result) => {
          if (err) {
            console.error("Error executing the query:", err);
            res.json({ error: "Internal server error" });
            return;
          }

          res.json({ error: null, response: "success" });
        }
      );
    }
  );
}

// Change Email function
async function changeemailcommon(req, res) {
  // Verify the JWT token
  const token = req.body.token;
  if (!token) {
    res.json({ error: "No token provided" });
    return;
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.YOUR_SECRET_KEY);
    // The decoded object contains the username if the token is valid
    // You can use decoded.username for further processing if needed
  } catch (err) {
    res.json({ error: "Invalid token" });
    return;
  }

  // Check if the user is an admin
  /*const userId = decoded.username;
  const groupName = "admin";

  try {
    const isAdmin = await checkGroup(userId, groupName);
    if (!isAdmin) {
      res.json({ error: "You do not have access to this resource!" });
      return;
    }
  } catch (err) {
    console.error("Error checking group:", err);
    res.json({ error: "Error checking group" });
    return;
  }

  // Check if the user is logged in
  if (!req.session.isLoggedIn) {
    return res.json({ error: "You are logged out!" });
  }*/

  const { username, newEmail } = req.body;

  // Validate the new email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(newEmail)) {
    return res.json({ error: "Email is invalid" });
  }

  // Check if the username exists in the database
  pool.execute(
    "SELECT * FROM userdetails WHERE username = ?",
    [username],
    (err, results) => {
      if (err) {
        console.error("Error executing the query:", err);
        return res.json({ error: "Internal server error" });
      }

      if (results.length === 0) {
        return res.json({ error: "Username does not exist!" });
      }

      // Update the email for the given username
      pool.execute(
        "UPDATE userdetails SET email = ? WHERE username = ?",
        [newEmail, username],
        (err, result) => {
          if (err) {
            console.error("Error executing the query:", err);
            return res.json({ error: "Internal server error" });
          }

          res.json({ error: null, response: "success" });
        }
      );
    }
  );
}

module.exports = {
  createnewuser,
  changepassword,
  changeemail,
  changegroup,
  changestatus,
  getgroups,
  creategroup,
  getUserDetails,
  changepasswordcommon,
  changeemailcommon,
};
