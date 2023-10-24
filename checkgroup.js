const mysql = require("mysql2");
const jwt = require("jsonwebtoken");

// Database configuration
const dbConfig = {
  host: "localhost",
  port: 3306,
  database: "nodelogin",
  user: "root",
  password: "freefrag",
};

// Create a MySQL connection pool
const connection = mysql.createConnection(dbConfig);

async function checkGroup(userid, groupname) {
  var statement = "%," + groupname + ",%";

  const connection_result = await connection
    .promise()
    .query(
      "SELECT username FROM userdetails WHERE username = ? AND usergroup LIKE ?",
      [userid, statement]
    );

  //console.log(connection_result);
  return connection_result[0] && connection_result[0][0] ? true : false;
}

// Check if the user is an admin (whether user has "admin" in their usergroup)
async function isGroup(req, res) {
  // Verify the JWT token
  const token = req.body.token;
  const groupName = req.body.groupName;
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

  // console.log(userId);

  try {
    const isAdmin = await checkGroup(userId, groupName);
    if (!isAdmin) {
      res.json({ error: "You do not have access to this resource!" });
      return;
    } else {
      res.json({ error: null, isAdmin: true });
      return;
    }
  } catch (err) {
    console.error("Error checking group:", err);
    res.json({ error: "Error checking group" });
    return;
  }
}

module.exports = { checkGroup, isGroup };
