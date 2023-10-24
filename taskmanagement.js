const mysql = require("mysql2");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const checkGroup = require("./checkgroup").checkGroup;
const nodemailer = require("nodemailer");

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

// node mailer settings
var transporter = nodemailer.createTransport({
  host: "sandbox.smtp.mailtrap.io",
  port: 2525,
  auth: {
    user: "3d51372c583a81",
    pass: "fb43e7c2e80daa",
  },
});

// Create app function
async function createApp(req, res) {
  const token = req.body.token;
  if (!token) {
    res.status(400).send("No token provided");
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

  const {
    App_acronym,
    App_Description,
    App_Rnumber,
    App_startDate,
    App_endDate,
    App_permit_Open,
    App_permit_toDoList,
    App_permit_Doing,
    App_permit_Done,
    App_permit_create,
  } = req.body;

  // Check if App_acronym already exists
  pool.query(
    "SELECT * FROM application WHERE App_acronym = ?",
    [App_acronym],
    (err, results) => {
      if (err) {
        console.error("Error executing the query", err);
        err.json({ error: "Error executing the query" });
        return;
      }
      if (results.length > 0) {
        res.error = "App_acronym already exists!";
        // return res.error;
        return res.json({ error: "App_acronym already exists!" });
        // res.json({ error: "App_acronym already exists" });
      }

      // Check if App_Rnumber is null
      if (App_Rnumber == null) {
        res.json({ error: "App_Rnumber cannot be null" });
        return;
      }

      // insert the new application into the database
      pool.query(
        "INSERT INTO application (App_acronym, App_Description, App_Rnumber, App_startDate, App_endDate, App_permit_Open, App_permit_toDoList, App_permit_Doing, App_permit_Done, App_permit_create) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          App_acronym,
          App_Description || null,
          App_Rnumber,
          App_startDate || null,
          App_endDate || null,
          App_permit_Open || null,
          App_permit_toDoList || null,
          App_permit_Doing || null,
          App_permit_Done || null,
          App_permit_create || null,
        ],
        (err, results) => {
          if (err) {
            console.error("Error executing the query", err);
            res.json({ error: "Error executing the query" });
            return;
          }
          res.json({
            error: null,
            success: "Application created successfully",
          });
        }
      );
    }
  );
}

// Create task function
async function createTask(req, res) {
  const token = req.body.token;
  if (!token) {
    res.status(400).send("No token provided");
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

  const {
    Task_name,
    Task_description,
    Task_notes,
    Task_plan,
    Task_app_Acronym,
    Task_owner,
  } = req.body;
  const stateindex = ["Open", "To-Do", "Doing", "Done", "Closed"];

  // Map Task_state to the corresponding group in stateindex, 1=Open, 2=To-Do, 3=Doing, 4=Done, 5=Closed
  const Task_state = 1;
  newTaskGroup = stateindex[Task_state - 1];

  if (!Task_app_Acronym) {
    return res.json({ error: "Task_app_Acronym cannot be blank!" });
  }

  if (!Task_name) {
    return res.json({ error: "Task_name cannot be blank!" });
  }

  // Fetch Rnumber from the application table, App_Rnumber column. Increment the Rnumber by 1
  pool.query(
    "SELECT App_Rnumber FROM application WHERE App_acronym = ?",
    [Task_app_Acronym],
    async (err, results) => {
      if (err) {
        console.error("Error executing the query", err);
        res.json({ error: "Error executing the query" });
        return;
      }
      if (results.length > 0) {
        let newRnumber = results[0].App_Rnumber + 1;

        // Update the Rnumber in the application table with newRnumber
        pool.query(
          "UPDATE application SET App_Rnumber = ? WHERE App_acronym = ?",
          [newRnumber, Task_app_Acronym],
          async (err, results) => {
            if (err) {
              console.error("Error executing the query", err);
              res.json({ error: "Error executing the query" });
              return;
            }
            if (results.affectedRows > 0) {
              const Task_id = Task_app_Acronym + "_" + newRnumber;
              const Task_state = 1;
              const Task_creator = decoded.username;
              const Task_owner = decoded.username;
              const Task_createDate = new Date();
              const newTaskNotes =
                Task_notes === "" || Task_notes === null
                  ? `-->>>--Task created--<<<--~~>>>~~${decoded.username}~~<<<~~==>>>==${newTaskGroup}==<<<==++>>>++${Task_createDate}++<<<++`
                  : `-->>>--${Task_notes}--<<<--~~>>>~~${decoded.username}~~<<<~~==>>>==${newTaskGroup}==<<<==++>>>++${Task_createDate}++<<<++-->>>--Task created--<<<--~~>>>~~${decoded.username}~~<<<~~==>>>==${newTaskGroup}==<<<==++>>>++${Task_createDate}++<<<++`;
              const Task_planValue = Task_plan === "" ? null : Task_plan;

              // insert the new task into the database
              pool.query(
                "INSERT INTO task (Task_name, Task_description, Task_notes, Task_id, Task_state, Task_plan, Task_app_Acronym, Task_creator, Task_owner, Task_createDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [
                  Task_name,
                  Task_description || null,
                  newTaskNotes,
                  Task_id,
                  Task_state,
                  Task_planValue,
                  Task_app_Acronym,
                  Task_creator,
                  Task_owner,
                  Task_createDate,
                ],
                (err, results) => {
                  if (err) {
                    console.error("Error executing the query", err);
                    res.json({ error: "Error executing the query" });
                    return;
                  }
                  res.json({
                    error: null,
                    success: "Task created successfully",
                  });
                }
              );
            }
          }
        );
      }
    }
  );
}

// Create plan function
async function createPlan(req, res) {
  const token = req.body.token;
  if (!token) {
    res.status(400).send("No token provided");
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

  const { Plan_MVP_name, Plan_startDate, Plan_endDate, Plan_app_Acronym } =
    req.body;

  // Check if Plan_app_Acronym exists in the application table
  pool.query(
    "SELECT * FROM application WHERE App_Acronym = ?",
    [Plan_app_Acronym],
    async (err, results) => {
      if (err) {
        console.error("Plan_app_Acronym does not exist", err);
        res.json({ error: "Plan_app_Acronym does not exist" });
        return;
      }
      if (results.length === 0) {
        res.json({ error: "Plan_app_Acronym does not exist" });
        return;
      }

      // Insert Plan data into the plan table
      pool.query(
        "INSERT INTO plan (Plan_MVP_name, Plan_startDate, Plan_endDate, Plan_app_Acronym) VALUES (?, ?, ?, ?)",
        [
          Plan_MVP_name,
          Plan_startDate || null,
          Plan_endDate || null,
          Plan_app_Acronym,
        ],
        (err, results) => {
          if (err) {
            console.error("Error executing the query", err);
            res.json({ error: "Error executing the query" });
            return;
          }
          res.json({
            error: null,
            success: "Plan created successfully",
          });
        }
      );
    }
  );
}

// // function to promote Task_state in the task table to the next number
// async function promoteTask(req, res) {
//   const token = req.body.token;
//   if (!token) {
//     res.status(400).send("No token provided");
//     return;
//   }

//   let decoded;
//   try {
//     decoded = jwt.verify(token, process.env.YOUR_SECRET_KEY);
//   } catch (err) {
//     res.json({ error: "Invalid token" });
//     return;
//   }

//   const { Task_id } = req.body;

//   pool.query(
//     "SELECT Task_state FROM task WHERE Task_id = ?",
//     [Task_id],
//     async (err, results) => {
//       if (err) {
//         console.error("Error executing the query:", err);
//         res.json({ error: "Internal server error" });
//         return;
//       }

//       const Task_state = results[0].Task_state;
//       const newTask_state = Task_state + 1;

//       pool.query(
//         "UPDATE task SET Task_state = ? WHERE Task_id = ?",
//         [newTask_state, Task_id],
//         async (err, results) => {
//           if (err) {
//             console.error("Error executing the query:", err);
//             res.json({ error: "Internal server error" });
//             return;
//           }
//           res.json({ error: null, response: "Task promoted successfully" });
//         }
//       );
//     }
//   );
// }

function sendEmailInBackground(email, transporter, mailOptions) {
  try {
    transporter.sendMail(mailOptions);
    console.log(`Email sent to ${email}`);
  } catch (err) {
    console.error(`Failed to send email to ${email}`);
  }
}

async function promoteTask(req, res) {
  const token = req.body.token;
  if (!token) {
    res.status(400).send("No token provided");
    return;
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.YOUR_SECRET_KEY);
  } catch (err) {
    res.json({ error: "Invalid token" });
    return;
  }

  const username = decoded.username;
  const { Task_id, Task_notes, Task_plan } = req.body;
  const stateindex = ["Open", "To-Do", "Doing", "Done", "Closed"];

  // Get the existing Task_state, Task_notes, Task_plan from the task table
  pool.query(
    "SELECT Task_state, Task_notes, Task_plan, Task_app_Acronym FROM task WHERE Task_id = ?",
    [Task_id],
    async (err, results) => {
      if (err) {
        console.error("Error executing the query:", err);
        res.json({ error: "Internal server error" });
        return;
      }

      if (results.length < 1) {
        console.error("Error executing the query:", err);
        res.json({ error: "no task found" });
        return;
      }

      const currentTaskState = results[0].Task_state;

      // Map the current state to the corresponding group in stateindex, 1=Open, 2=To-Do, 3=Doing, 4=Done, 5=Closed
      const currentTaskGroup = stateindex[currentTaskState - 1];
      const newTaskGroup = stateindex[currentTaskState];

      const currentTaskNotes = results[0].Task_notes;
      const currentTaskPlan = results[0].Task_plan;
      const Task_app_Acronym = results[0].Task_app_Acronym;

      let newTaskNotes = currentTaskNotes;

      // if (Task_notes !== undefined && Task_notes !== "") {
      //   newTaskNotes = `-->>>--Promoted from ${currentTaskGroup} to ${newTaskGroup}--<<<--~~>>>~~${
      //     decoded.username
      //   }~~<<<~~==>>>==${currentTaskGroup}==<<<==++>>>++${new Date()}++<<<++-->>>--${Task_notes}--<<<--~~>>>~~${
      //     decoded.username
      //   }~~<<<~~==>>>==${currentTaskGroup}==<<<==++>>>++${new Date()}++<<<++${currentTaskNotes}`;
      // } else {
      //   newTaskNotes = `-->>>--Promoted from ${currentTaskGroup} to ${newTaskGroup}--<<<--~~>>>~~${
      //     decoded.username
      //   }~~<<<~~==>>>==${currentTaskGroup}==<<<==++>>>++${new Date()}++<<<++${currentTaskNotes}`;
      // }

      if (Task_notes !== undefined && Task_notes !== "") {
        newTaskNotes = `-->>>--(Promoted from ${currentTaskGroup} to ${newTaskGroup})\nTask Notes: ${Task_notes}--<<<--~~>>>~~${
          decoded.username
        }~~<<<~~==>>>==${currentTaskGroup}==<<<==++>>>++${new Date()}++<<<++${currentTaskNotes}`;
      } else {
        newTaskNotes = `-->>>--(Promoted from ${currentTaskGroup} to ${newTaskGroup})--<<<--~~>>>~~${
          decoded.username
        }~~<<<~~==>>>==${currentTaskGroup}==<<<==++>>>++${new Date()}++<<<++${currentTaskNotes}`;
      }

      const newTaskState = currentTaskState + 1;

      let newTaskPlan = currentTaskPlan;

      if (Task_plan !== undefined && Task_plan !== "") {
        newTaskPlan = Task_plan;
      }

      pool.query(
        "UPDATE task SET Task_state = ?, Task_notes = ?, Task_owner = ?, Task_plan = ? WHERE Task_id = ?",
        [newTaskState, newTaskNotes, decoded.username, newTaskPlan, Task_id],
        async (err, results) => {
          if (err) {
            console.error("Error executing the query:", err);
            res.json({ error: "Internal server error" });
            return;
          }

          res.json({
            error: null,
            response: "Task promoted and notes updated successfully",
          });

          if (newTaskState === 4) {
            const appRows = await pool
              .promise()
              .execute(
                "SELECT App_permit_Done FROM application WHERE App_Acronym = ?",
                [Task_app_Acronym]
              ); // Fetch the permitted groups for the "done" state of the application.
            const permittedGroup = appRows[0][0].App_permit_Done;
            const userRows = await pool
              .promise()
              .execute("SELECT email FROM userdetails WHERE usergroup LIKE ?", [
                `%,${permittedGroup},%`,
              ]); // Fetch associated emails for the fetched group.
            const userEmails = userRows[0].map((row) => row.email);

            if (userEmails.length < 1) return;

            userEmails.map((email) => {
              console.log(email);
              if (email) {
                const mailOptions = {
                  from: "your-email@example.com",
                  to: email, // Recipient's email
                  subject: "Task State Update",
                  text: `The task with ID ${Task_id} has been promoted to state ${newTaskGroup}.`,
                };
                sendEmailInBackground(email, transporter, mailOptions); // Send the email in the background without awaiting
              }
            });
          }
        }
      );
    }
  );
}

// function to demote Task_state in the task table to the previous number
async function demoteTask(req, res) {
  const token = req.body.token;
  if (!token) {
    res.status(400).send("No token provided");
    return;
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.YOUR_SECRET_KEY);
  } catch (err) {
    res.json({ error: "Invalid token" });
    return;
  }

  const { Task_id, Task_notes, Task_plan } = req.body;
  const stateindex = ["Open", "To-Do", "Doing", "Done", "Closed"];

  // Get the existing Task_state, Task_notes from the task table
  pool.query(
    "SELECT Task_state, Task_notes, Task_plan FROM task WHERE Task_id = ?",
    [Task_id],
    async (err, results) => {
      if (err) {
        console.error("Error executing the query:", err);
        res.json({ error: "Internal server error" });
        return;
      }

      if (results.length < 1) {
        console.error("Error executing the query:", err);
        res.json({ error: "no task found" });
        return;
      }

      const currentTaskState = results[0].Task_state;

      // Map currentTaskState to the corresponding group in stateindex, 1=Open, 2=To-Do, 3=Doing, 4=Done, 5=Closed
      const currentTaskGroup = stateindex[currentTaskState - 1];
      const newTaskGroup = stateindex[currentTaskState - 2];

      const currentTaskNotes = results[0].Task_notes;
      const currentTaskPlan = results[0].Task_plan;

      let newTaskNotes = currentTaskNotes;

      // if (Task_notes !== undefined && Task_notes !== "") {
      //   newTaskNotes = `-->>>--Demoted from ${currentTaskGroup} to ${newTaskGroup}--<<<--~~>>>~~${
      //     decoded.username
      //   }~~<<<~~==>>>==${currentTaskGroup}==<<<==++>>>++${new Date()}++<<<++-->>>--${Task_notes}--<<<--~~>>>~~${
      //     decoded.username
      //   }~~<<<~~==>>>==${currentTaskGroup}==<<<==++>>>++${new Date()}++<<<++${currentTaskNotes}`;
      // } else {
      //   newTaskNotes = `-->>>--Demoted from ${currentTaskGroup} to ${newTaskGroup}--<<<--~~>>>~~${
      //     decoded.username
      //   }~~<<<~~==>>>==${currentTaskGroup}==<<<==++>>>++${new Date()}++<<<++${currentTaskNotes}`;
      // }

      if (Task_notes !== undefined && Task_notes !== "") {
        newTaskNotes = `-->>>--(Demoted from ${currentTaskGroup} to ${newTaskGroup})\nTask Notes: ${Task_notes}--<<<--~~>>>~~${
          decoded.username
        }~~<<<~~==>>>==${currentTaskGroup}==<<<==++>>>++${new Date()}++<<<++${currentTaskNotes}`;
      } else {
        newTaskNotes = `-->>>--(Demoted from ${currentTaskGroup} to ${newTaskGroup})--<<<--~~>>>~~${
          decoded.username
        }~~<<<~~==>>>==${currentTaskGroup}==<<<==++>>>++${new Date()}++<<<++${currentTaskNotes}`;
      }

      const newTask_state = currentTaskState - 1;
      let newTaskPlan = currentTaskPlan;

      if (Task_plan !== undefined && Task_plan !== "") {
        newTaskPlan = Task_plan;
      } else {
        newTaskPlan = currentTaskPlan;
      }

      pool.query(
        "UPDATE task SET Task_state = ?, Task_notes = ?, Task_owner = ?, Task_plan = ? WHERE Task_id = ?",
        [newTask_state, newTaskNotes, decoded.username, newTaskPlan, Task_id],
        async (err, results) => {
          if (err) {
            console.error("Error executing the query:", err);
            res.json({ error: "Internal server error" });
            return;
          }
          res.json({
            error: null,
            response: "Task demoted and notes updated successfully",
          });
        }
      );
    }
  );
}

async function getPlanDetails(req, res) {
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

  // Get the plan acronym from the request body
  // const Plan_Acronym = req.body.Plan_Acronym;

  try {
    // Query the plan table for the specified columns where Plan_Acronym matches Plan_app_Acronym
    const query =
      // "SELECT Plan_MVP_Name, Plan_startDate, Plan_endDate, Plan_app_Acronym FROM plan WHERE Plan_app_Acronym = ?";
      "SELECT Plan_MVP_Name, Plan_startDate, Plan_endDate, Plan_app_Acronym FROM plan";
    // const [rows] = await pool.promise().execute(query, [Plan_Acronym]);
    const [rows] = await pool.promise().execute(query);

    // Send the retrieved rows as a response to the client
    res.json({ data: rows });
  } catch (error) {
    // Handle any errors that occur during the database operation
    console.error("Error retrieving user details:", error);
    res.json({ error: "Error retrieving user details" });
  }
}

async function getAppDetails(req, res) {
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

  // Get the plan acronym from the request body
  // const App_Acronym = req.body.App_Acronym;

  try {
    // Query the plan table for the specified columns where Plan_Acronym matches Plan_app_Acronym
    const query =
      "SELECT App_Acronym, App_Description, App_Rnumber, App_startDate, App_endDate, App_permit_Open, App_permit_toDoList, App_permit_Doing, App_permit_Done, App_permit_create FROM application";
    const [rows] = await pool.promise().execute(query);

    // Send the retrieved rows as a response to the client
    res.json({ data: rows });
  } catch (error) {
    // Handle any errors that occur during the database operation
    console.error("Error retrieving user details:", error);
    res.json({ error: "Error retrieving user details" });
  }
}

async function getAppDetailsForOneApp(req, res) {
  const token = req.body.token;
  if (!token) {
    res.status(400).send("No token provided");
    return;
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.YOUR_SECRET_KEY);
  } catch (err) {
    res.json({ error: "Invalid token" });
    return;
  }

  const { App_Acronym } = req.body;
  // const stateindex = ["Open", "To-Do", "Doing", "Done", "Closed"];

  pool.query(
    "SELECT App_Acronym, App_Description, App_Rnumber, App_startDate, App_endDate, App_permit_Open, App_permit_toDoList, App_permit_Doing, App_permit_Done, App_permit_create FROM application WHERE App_Acronym = ?",
    [App_Acronym],
    (err, results) => {
      if (err) {
        console.error("Error executing the query:", err);
        res.json({ error: "Internal server error" });
        return;
      }

      if (results.length === 0) {
        res.json({ error: "app not found" });
        return;
      }

      const appDetails = results[0];

      // Map the Task_state to the corresponding stateindex, 1=Open, 2=To-Do, 3=Doing, 4=Done, 5=Closed
      // taskDetails.Task_state = stateindex[taskDetails.Task_state - 1];

      res.json({ error: null, response: appDetails });
    }
  );
}

async function GetTaskNotes(req, res) {
  const token = req.body.token;
  if (!token) {
    res.status(400).send("No token provided");
    return;
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.YOUR_SECRET_KEY);
  } catch (err) {
    res.json({ error: "Invalid token" });
    return;
  }

  const { Task_id } = req.body;

  // Fetch the Task_notes column from the database
  pool.query(
    "SELECT Task_notes FROM task WHERE Task_id = ?",
    [Task_id],
    (err, results) => {
      if (err) {
        console.error("Error executing the query", err);
        res.json({ error: "Error executing the query" });
        return;
      }

      if (results.length === 0) {
        res.json({ error: "Task not found" });
        return;
      }

      const taskNotesStr = results[0].Task_notes;

      if (!taskNotesStr) {
        // Task notes field is empty, return an empty array
        res.json({ data: [] });
        return;
      }

      const notesArray = taskNotesStr.split("++<<<++");

      const taskNoteObjects = notesArray
        .map((noteStr) => {
          const noteParts = noteStr.split("-->>>--");
          if (noteParts.length === 2) {
            const [Task_notes, remaining] =
              noteParts[1].split("--<<<--~~>>>~~");
            const [username, remaining2] = remaining.split("~~<<<~~==>>>==");
            const [Task_state, Timestamp] = remaining2.split("==<<<==++>>>++");
            return {
              Task_notes,
              username,
              Task_state,
              Timestamp,
            };
          }
          return null; // Handle invalid note structure if needed
        })
        .filter((noteObject) => noteObject !== null);

      res.json({ data: taskNoteObjects });
    }
  );
}

// Get app acronym function
async function getAppAcronym(req, res) {
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

  // Fetch all the groups from the usergroup table
  pool.execute("SELECT App_Acronym FROM application", (err, results) => {
    if (err) {
      console.error("Error executing the query:", err);
      return res.json({ error: "Internal server error" });
    }

    // Extract the list of groups from the results
    const appList = results.map((group) => group.App_Acronym);

    res.json({ error: null, groups: appList });
  });
}

// Get plan name function
async function getPlanName(req, res) {
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

  Plan_app_Acronym = req.body.Plan_app_Acronym;

  // Fetch all the groups from the usergroup table
  pool.execute(
    "SELECT Plan_MVP_Name FROM plan WHERE Plan_app_Acronym = ?",
    [Plan_app_Acronym],
    (err, results) => {
      if (err) {
        console.error("Error executing the query:", err);
        return res.json({ error: "Internal server error" });
      }

      // Extract the list of groups from the results
      const planList = results.map((group) => group.Plan_MVP_Name);

      res.json({ error: null, groups: planList });
    }
  );
}

async function editPlan(req, res) {
  const token = req.body.token;
  if (!token) {
    res.status(400).send("No token provided");
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

  const { Plan_MVP_Name, Plan_startDate, Plan_endDate } = req.body;

  // Check if either Plan_startDate or Plan_endDate is provided
  if (!Plan_startDate && !Plan_endDate) {
    res.json({
      error: "At least one of Plan_startDate or Plan_endDate must be provided",
    });
    return;
  }

  let updateClause = "";
  let values = [];

  if (Plan_startDate) {
    updateClause += "Plan_startDate = ?, ";
    values.push(Plan_startDate);
  }

  if (Plan_endDate) {
    updateClause += "Plan_endDate = ?, ";
    values.push(Plan_endDate);
  }

  // Remove the trailing comma and space from updateClause
  updateClause = updateClause.slice(0, -2);

  // Update the row in the plan table
  const updateQuery = `UPDATE plan SET ${updateClause} WHERE Plan_MVP_Name = ?`;

  pool.query(updateQuery, [...values, Plan_MVP_Name], (err, results) => {
    if (err) {
      console.error("Error executing the query:", err);
      res.json({ error: "Error updating the plan" });
      return;
    }

    if (results.affectedRows > 0) {
      res.json({ error: null, success: "Plan updated successfully" });
    } else {
      res.json({ error: "No matching plan found" });
    }
  });
}

async function editApp(req, res) {
  const token = req.body.token;
  if (!token) {
    res.status(400).send("No token provided");
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

  const {
    App_Acronym,
    App_Description,
    App_startDate,
    App_endDate,
    App_permit_Open,
    App_permit_toDoList,
    App_permit_Doing,
    App_permit_Done,
    App_permit_create,
  } = req.body;

  // Create an object to store the updated fields
  const updateFields = {};

  if (App_Description !== undefined && App_Description !== "") {
    updateFields.App_Description = App_Description;
  }
  if (App_startDate !== undefined && App_startDate !== "") {
    updateFields.App_startDate = App_startDate;
  }
  if (App_endDate !== undefined && App_endDate !== "") {
    updateFields.App_endDate = App_endDate;
  }
  if (
    App_permit_Open !== undefined &&
    App_permit_Open !== "" &&
    App_permit_Open !== "null"
  ) {
    updateFields.App_permit_Open = App_permit_Open;
  } else if (App_permit_Open === "null") {
    updateFields.App_permit_Open = null;
  }
  if (
    App_permit_toDoList !== undefined &&
    App_permit_toDoList !== "" &&
    App_permit_toDoList !== "null"
  ) {
    updateFields.App_permit_toDoList = App_permit_toDoList;
  } else if (App_permit_toDoList === "null") {
    updateFields.App_permit_toDoList = null;
  }
  if (
    App_permit_Doing !== undefined &&
    App_permit_Doing !== "" &&
    App_permit_Doing !== "null"
  ) {
    updateFields.App_permit_Doing = App_permit_Doing;
  } else if (App_permit_Doing === "null") {
    updateFields.App_permit_Doing = null;
  }
  if (
    App_permit_Done !== undefined &&
    App_permit_Done !== "" &&
    App_permit_Done !== "null"
  ) {
    updateFields.App_permit_Done = App_permit_Done;
  } else if (App_permit_Done === "null") {
    updateFields.App_permit_Done = null;
  }
  if (
    App_permit_create !== undefined &&
    App_permit_create !== "" &&
    App_permit_create !== "null"
  ) {
    updateFields.App_permit_create = App_permit_create;
  } else if (App_permit_create === "null") {
    updateFields.App_permit_create = null;
  }

  // Update the application table based on the provided Acronym
  const updateQuery = "UPDATE application SET ? WHERE App_Acronym = ?";
  const updateParams = [updateFields, App_Acronym];

  pool.query(updateQuery, updateParams, (error, results) => {
    if (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    } else {
      if (results.affectedRows > 0) {
        res.json({ message: "Application updated successfully" });
      } else {
        res.json({ error: "Failed to update application" });
      }
    }
  });
}

async function editTask(req, res) {
  const token = req.body.token;
  if (!token) {
    res.status(400).send("No token provided");
    return;
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.YOUR_SECRET_KEY);
  } catch (err) {
    res.json({ error: "Invalid token" });
    return;
  }

  const { Task_id, Task_notes, Task_plan } = req.body;
  const stateindex = ["Open", "To-Do", "Doing", "Done", "Closed"];

  // Get the existing Task_state, Task_notes, and Task_plan from the task table
  pool.query(
    "SELECT Task_state, Task_notes, Task_plan FROM task WHERE Task_id = ?",
    [Task_id],
    (err, results) => {
      if (err) {
        console.error("Error executing the query", err);
        res.json({ error: "Error executing the query" });
        return;
      }
      if (results.length === 0) {
        res.json({ error: "Task not found" });
        return;
      }

      const currentTaskState = results[0].Task_state;

      // Map currentTaskState to the corresponding stateindex, 1=Open, 2=To-Do, 3=Doing, 4=Done, 5=Closed
      const currentTaskStateIndex = stateindex[currentTaskState - 1];

      const currentTaskNotes = results[0].Task_notes;
      const currentTaskPlan = results[0].Task_plan;

      let newTaskNotes = currentTaskNotes;
      let newTaskPlan = currentTaskPlan;
      let updateTaskPlan = currentTaskNotes;

      if (Task_plan !== undefined && Task_plan !== "") {
        newTaskPlan = Task_plan;
        updateTaskPlan = `-->>>--Task assigned to ${Task_plan}--<<<--~~>>>~~${
          decoded.username
        }~~<<<~~==>>>==${currentTaskStateIndex}==<<<==++>>>++${new Date()}++<<<++${currentTaskNotes}`;
      }

      if (Task_notes !== undefined && Task_notes !== "") {
        newTaskNotes = `-->>>--Updated this task\nTask Notes: ${Task_notes}--<<<--~~>>>~~${
          decoded.username
        }~~<<<~~==>>>==${currentTaskStateIndex}==<<<==++>>>++${new Date()}++<<<++${updateTaskPlan}`;
      } else {
        newTaskNotes = updateTaskPlan;
      }

      // Update the corresponding fields in Task_notes and Task_plan columns
      pool.query(
        "UPDATE task SET Task_notes = ?, Task_plan = ?, Task_owner = ? WHERE Task_id = ?",
        [newTaskNotes, newTaskPlan, decoded.username, Task_id],
        (updateErr, updateResults) => {
          if (updateErr) {
            console.error("Error updating task notes and plan", updateErr);
            res.json({ error: "Error updating task notes and plan" });
            return;
          }
          res.json({ message: "Task notes and plan updated successfully" });
        }
      );
    }
  );
}

async function viewTaskDetails(req, res) {
  const token = req.body.token;
  if (!token) {
    res.status(400).send("No token provided");
    return;
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.YOUR_SECRET_KEY);
  } catch (err) {
    res.json({ error: "Invalid token" });
    return;
  }

  const { Task_id } = req.body;
  const stateindex = ["Open", "To-Do", "Doing", "Done", "Closed"];

  pool.query(
    "SELECT Task_name, Task_description, Task_plan, Task_app_Acronym, Task_state, Task_creator, Task_owner, Task_createDate, Task_id FROM task WHERE Task_id = ?",
    [Task_id],
    (err, results) => {
      if (err) {
        console.error("Error executing the query:", err);
        res.json({ error: "Internal server error" });
        return;
      }

      if (results.length === 0) {
        res.json({ error: "Task not found" });
        return;
      }

      const taskDetails = results[0];

      // Map the Task_state to the corresponding stateindex, 1=Open, 2=To-Do, 3=Doing, 4=Done, 5=Closed
      taskDetails.Task_state = stateindex[taskDetails.Task_state - 1];

      res.json({ error: null, response: taskDetails });
    }
  );
}

async function GetTaskDetailsKanban(req, res) {
  const token = req.body.token;
  if (!token) {
    res.status(400).send("No token provided");
    return;
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.YOUR_SECRET_KEY);
  } catch (err) {
    res.json({ error: "Invalid token" });
    return;
  }

  const { Task_app_Acronym } = req.body;

  pool.query(
    "SELECT Task_name, Task_id, Task_state, Task_plan, Task_createDate FROM task WHERE Task_app_Acronym = ?",
    [Task_app_Acronym],
    (err, results) => {
      if (err) {
        console.error("Error executing the query:", err);
        res.json({ error: "Internal server error" });
        return;
      }

      if (results.length === 0) {
        res.json({ error: "No tasks found for the given Task_app_Acronym" });
        return;
      }

      const taskDetails = results;

      res.json({ error: null, response: taskDetails });
    }
  );
}

async function getAppPermitOpen(req, res) {
  const token = req.body.token;
  if (!token) {
    res.status(400).send("No token provided");
    return;
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.YOUR_SECRET_KEY);
  } catch (err) {
    res.json({ error: "Invalid token" });
    return;
  }

  const { App_Acronym } = req.body;

  // Fetch the App_permit_Open column from the database
  pool.query(
    "SELECT App_permit_Open FROM application WHERE App_Acronym = ?",
    [App_Acronym],
    (err, results) => {
      if (err) {
        console.error("Error executing the query", err);
        res.json({ error: "Error executing the query" });
        return;
      }

      if (results.length === 0) {
        res.json({ error: "Application not found" });
        return;
      }

      const appPermitOpen = results[0].App_permit_Open;
      res.json({ data: appPermitOpen });
    }
  );
}

async function getAppPermitToDo(req, res) {
  const token = req.body.token;
  if (!token) {
    res.status(400).send("No token provided");
    return;
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.YOUR_SECRET_KEY);
  } catch (err) {
    res.json({ error: "Invalid token" });
    return;
  }

  const { App_Acronym } = req.body;

  // Fetch the App_permit_Open column from the database
  pool.query(
    "SELECT App_permit_toDoList FROM application WHERE App_Acronym = ?",
    [App_Acronym],
    (err, results) => {
      if (err) {
        console.error("Error executing the query", err);
        res.json({ error: "Error executing the query" });
        return;
      }

      if (results.length === 0) {
        res.json({ error: "Application not found" });
        return;
      }

      const appPermitToDo = results[0].App_permit_toDoList;
      res.json({ data: appPermitToDo });
    }
  );
}

async function getAppPermitDoing(req, res) {
  const token = req.body.token;
  if (!token) {
    res.status(400).send("No token provided");
    return;
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.YOUR_SECRET_KEY);
  } catch (err) {
    res.json({ error: "Invalid token" });
    return;
  }

  const { App_Acronym } = req.body;

  // Fetch the App_permit_Open column from the database
  pool.query(
    "SELECT App_permit_Doing FROM application WHERE App_Acronym = ?",
    [App_Acronym],
    (err, results) => {
      if (err) {
        console.error("Error executing the query", err);
        res.json({ error: "Error executing the query" });
        return;
      }

      if (results.length === 0) {
        res.json({ error: "Application not found" });
        return;
      }

      const appPermitDoing = results[0].App_permit_Doing;
      res.json({ data: appPermitDoing });
    }
  );
}

async function getAppPermitDone(req, res) {
  const token = req.body.token;
  if (!token) {
    res.status(400).send("No token provided");
    return;
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.YOUR_SECRET_KEY);
  } catch (err) {
    res.json({ error: "Invalid token" });
    return;
  }

  const { App_Acronym } = req.body;

  // Fetch the App_permit_Open column from the database
  pool.query(
    "SELECT App_permit_Done FROM application WHERE App_Acronym = ?",
    [App_Acronym],
    (err, results) => {
      if (err) {
        console.error("Error executing the query", err);
        res.json({ error: "Error executing the query" });
        return;
      }

      if (results.length === 0) {
        res.json({ error: "Application not found" });
        return;
      }

      const appPermitDone = results[0].App_permit_Done;
      res.json({ data: appPermitDone });
    }
  );
}

async function getAppPermitCreate(req, res) {
  const token = req.body.token;
  if (!token) {
    res.status(400).send("No token provided");
    return;
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.YOUR_SECRET_KEY);
  } catch (err) {
    res.json({ error: "Invalid token" });
    return;
  }

  const { App_Acronym } = req.body;

  // Fetch the App_permit_Open column from the database
  pool.query(
    "SELECT App_permit_create FROM application WHERE App_Acronym = ?",
    [App_Acronym],
    (err, results) => {
      if (err) {
        console.error("Error executing the query", err);
        res.json({ error: "Error executing the query" });
        return;
      }

      if (results.length === 0) {
        res.json({ error: "Application not found" });
        return;
      }

      const appPermitCreate = results[0].App_permit_create;
      res.json({ data: appPermitCreate });
    }
  );
}

module.exports = {
  createApp,
  createTask,
  createPlan,
  promoteTask,
  demoteTask,
  getPlanDetails,
  getAppDetails,
  GetTaskNotes,
  getAppAcronym,
  getPlanName,
  editPlan,
  editApp,
  editTask,
  viewTaskDetails,
  GetTaskDetailsKanban,
  getAppPermitOpen,
  getAppPermitToDo,
  getAppPermitDoing,
  getAppPermitDone,
  getAppPermitCreate,
  getAppDetailsForOneApp,
};
