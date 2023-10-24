const mysql = require("mysql2");
// const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
dotenv.config({ path: ".env" });

console.log(process.env.DB_HOST);
// Database configuration
const dbConfig = {
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
};

// Create a MySQL connection pool
const connection = mysql.createConnection(dbConfig);

// node mailer settings
var transporter = nodemailer.createTransport({
  host: "sandbox.smtp.mailtrap.io",
  port: 2525,
  auth: {
    user: "3d51372c583a81",
    pass: "fb43e7c2e80daa",
  },
});

function comparePasswords(password, hashedPassword) {
  return bcrypt.compareSync(password, hashedPassword);
}

function sendEmailInBackground(email, transporter, mailOptions) {
  try {
    transporter.sendMail(mailOptions);
    console.log(`Email sent to ${email}`);
  } catch (err) {
    console.error(`Failed to send email to ${email}`);
  }
}

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

async function CreateTask(req, res) {
  const {
    Username,
    Password,
    Task_name,
    Task_description,
    Task_plan,
    Task_app_Acronym,
  } = req.body;

  // if either Username, Password, Task_name or Task_app_Acronym is missing, return Json object:{error : “Mandatory request variables not present”, “code” : “E102”}
  if (!Username || !Password || !Task_name || !Task_app_Acronym) {
    return res.json({
      code: "E102",
    });
  }

  // if any of the req.body are not string, return Json object:{error : “Request variables not in the correct data type”, “code” : “E103”}
  if (
    typeof Username !== "string" ||
    typeof Password !== "string" ||
    typeof Task_name !== "string" ||
    (Task_description !== undefined && typeof Task_description !== "string") ||
    (Task_plan !== undefined && typeof Task_plan !== "string") ||
    typeof Task_app_Acronym !== "string"
  ) {
    res.json({
      code: "E103",
    });
    return;
  }

  // login using Username and Password. check from the database (table: userdetails, Username = "username" column, Password = "password" column using bcrypt to decode). if the Username and Password match, return true, else return false
  let login;

  try {
    login = await connection
      .promise()
      .query("SELECT password FROM userdetails WHERE username = ?", [Username]);
  } catch (err) {
    res.json({ code: "E201" });
    return;
  }

  // console.log(login);

  if (login[0] && login[0].length < 1) {
    res.json({ code: "E201" });
    return;
  }

  const hashedPassword = login[0][0].password;

  // Compare the entered password with the hashed password
  if (!comparePasswords(Password, hashedPassword)) {
    res.json({ code: "E201" });
    return;
  }

  let isactive;

  try {
    isactive = await connection
      .promise()
      .query("SELECT status FROM userdetails WHERE username = ?", [Username]);
  } catch (err) {
    res.json({ code: "E202" });
    return;
  }

  const userStatus = isactive[0][0].status;

  if (userStatus !== 1) {
    res.json({ code: "E202" });
    return;
  }

  let applicationexist;

  try {
    // Query the database for the Task_app_Acronym
    const [rows] = await connection
      .promise()
      .query("SELECT App_Acronym FROM application WHERE App_Acronym = ?", [
        Task_app_Acronym,
      ]);

    // Check if the query returned any rows
    if (rows.length === 0) {
      // If no rows were returned, Task_app_Acronym does not exist in the database
      res.json({ code: "E301" });
      return;
    }

    // If rows were returned, Task_app_Acronym exists in the database
    applicationexist = rows;
  } catch (err) {
    // Handle any errors that occurred during the query
    res.json({ code: "E301" });
    return;
  }

  const groupName = await connection
    .promise()
    .query("SELECT App_permit_create FROM application WHERE App_Acronym = ?", [
      Task_app_Acronym,
    ]);
  const userId = Username;

  try {
    const isAdmin = await checkGroup(userId, groupName[0][0].App_permit_create);
    if (!isAdmin) {
      res.json({ code: "E303" });
      return;
    }
  } catch (err) {
    //console.error("Error checking group:", err);
    res.json({ code: "E303" });
    return;
  }

  if (Task_plan) {
    try {
      const [results] = await connection.promise().query(
        // select from the plan table where Task_plan = "Plan_MVP_Name" column and Task_app_Acronym = "Plan_app_Acronym" column
        "SELECT * FROM plan WHERE Plan_MVP_Name = ? AND Plan_app_Acronym = ?",
        [Task_plan, Task_app_Acronym]
      );

      if (results.length < 1) {
        res.json({ code: "E401" });
        return;
      }
    } catch (err) {
      res.json({ code: "E401" });
      return;
    }
  }

  // check is Task_name is more than 255 characters, if yes, return Json object:{code : “E402”}
  if (Task_name.length > 255) {
    res.json({ code: "E402" });
    return;
  }

  const stateindex = ["Open", "To-Do", "Doing", "Done", "Closed"];

  // Map Task_state to the corresponding group in stateindex, 1=Open, 2=To-Do, 3=Doing, 4=Done, 5=Closed
  const Task_state = 1;
  newTaskGroup = stateindex[Task_state - 1];

  // Fetch Rnumber from the application table, App_Rnumber column. Increment the Rnumber by 1
  connection.query(
    "SELECT App_Rnumber FROM application WHERE App_acronym = ?",
    [Task_app_Acronym],
    async (err, results) => {
      if (err) {
        res.json({ code: "E454" });
        return;
      }
      if (results.length > 0) {
        let newRnumber = results[0].App_Rnumber + 1;

        // Update the Rnumber in the application table with newRnumber
        connection.query(
          "UPDATE application SET App_Rnumber = ? WHERE App_acronym = ?",
          [newRnumber, Task_app_Acronym],
          async (err, results) => {
            if (err) {
              res.json({ code: "E454" });
              return;
            }
            if (results.affectedRows > 0) {
              const Task_id = Task_app_Acronym + "_" + newRnumber;
              const Task_state = 1;
              const Task_creator = Username;
              const Task_owner = Username;
              const Task_createDate = new Date();
              const Task_notes = "";
              const newTaskNotes =
                Task_notes === "" || Task_notes === null
                  ? `-->>>--Task created--<<<--~~>>>~~${Username}~~<<<~~==>>>==${newTaskGroup}==<<<==++>>>++${Task_createDate}++<<<++`
                  : `-->>>--${Task_notes}--<<<--~~>>>~~${Username}~~<<<~~==>>>==${newTaskGroup}==<<<==++>>>++${Task_createDate}++<<<++-->>>--Task created--<<<--~~>>>~~${Username}~~<<<~~==>>>==${newTaskGroup}==<<<==++>>>++${Task_createDate}++<<<++`;
              const Task_planValue = Task_plan === "" ? null : Task_plan;

              // insert the new task into the database
              connection.query(
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
                    res.json({ code: "E454" });
                    return;
                  }
                  res.json({
                    Task_id: Task_id,
                    code: "S01",
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

async function GetTaskbyState(req, res) {
  const { Username, Password, Task_state, Task_app_Acronym } = req.body;

  if (!Username || !Password || !Task_state || !Task_app_Acronym) {
    return res.json({
      code: "E102",
    });
  }

  // if any of the req.body are not string, return Json object:{error : “Request variables not in the correct data type”, “code” : “E103”}
  else if (
    typeof Username !== "string" ||
    typeof Password !== "string" ||
    typeof Task_state !== "string" ||
    typeof Task_app_Acronym !== "string"
  ) {
    res.json({
      code: "E103",
    });
    return;
  }

  // login using Username and Password. check from the database (table: userdetails, Username = "username" column, Password = "password" column using bcrypt to decode). if the Username and Password match, return true, else return false
  let login;

  try {
    login = await connection
      .promise()
      .query("SELECT password FROM userdetails WHERE username = ?", [Username]);
  } catch (err) {
    res.json({ code: "E201" });
    return;
  }

  // console.log(login);

  if (login[0] && login[0].length < 1) {
    res.json({ code: "E201" });
    return;
  }

  const hashedPassword = login[0][0].password;

  // Compare the entered password with the hashed password
  if (!comparePasswords(Password, hashedPassword)) {
    res.json({ code: "E201" });
    return;
  }

  let isactive;

  try {
    isactive = await connection
      .promise()
      .query("SELECT status FROM userdetails WHERE username = ?", [Username]);
  } catch (err) {
    res.json({ code: "E202" });
    return;
  }

  const userStatus = isactive[0][0].status;

  if (userStatus !== 1) {
    res.json({ code: "E202" });
    return;
  }

  let applicationexist;

  try {
    // Query the database for the Task_app_Acronym
    const [rows] = await connection
      .promise()
      .query("SELECT App_Acronym FROM application WHERE App_Acronym = ?", [
        Task_app_Acronym,
      ]);

    // Check if the query returned any rows
    if (rows.length === 0) {
      // If no rows were returned, Task_app_Acronym does not exist in the database
      res.json({ code: "E301" });
      return;
    }

    // If rows were returned, Task_app_Acronym exists in the database
    applicationexist = rows;
  } catch (err) {
    // Handle any errors that occurred during the query
    res.json({ code: "E301" });
    return;
  }

  if (
    Task_state !== "Open" &&
    Task_state !== "To-Do" &&
    Task_state !== "Doing" &&
    Task_state !== "Done" &&
    Task_state !== "Closed"
  ) {
    return res.json({
      code: "E403",
    });
  }

  let NumberTaskState;
  // if Task_state=Open, Task_state is now set to 1
  if (Task_state === "Open") {
    NumberTaskState = 1;
  }
  if (Task_state === "To-Do") {
    NumberTaskState = 2;
  }
  if (Task_state === "Doing") {
    NumberTaskState = 3;
  }
  if (Task_state === "Done") {
    NumberTaskState = 4;
  }
  if (Task_state === "Closed") {
    NumberTaskState = 5;
  }

  // select all tasks from the task table where Task_state = "Task_state" column and Task_app_Acronym = "Task_app_Acronym" column
  connection.query(
    "SELECT * FROM task WHERE Task_state = ? AND Task_app_Acronym = ?",
    [NumberTaskState, Task_app_Acronym],
    (err, results) => {
      if (err) {
        res.json({ code: "E454" });
        return;
      }
      if (results.length > 0) {
        res.json({
          tasks: results,
          code: "S01",
        });
      } else {
        res.json({ tasks: results, code: "S01" });
      }
    }
  );
}

async function PromoteTask2Done(req, res) {
  const { Username, Password, Task_id } = req.body;

  if (!Username || !Password || !Task_id) {
    return res.json({
      code: "E102",
    });
  }

  // if any of the req.body are not string, return Json object:{error : “Request variables not in the correct data type”, “code” : “E103”}
  else if (
    typeof Username !== "string" ||
    typeof Password !== "string" ||
    typeof Task_id !== "string"
  ) {
    res.json({
      code: "E103",
    });
    return;
  }

  // login using Username and Password. check from the database (table: userdetails, Username = "username" column, Password = "password" column using bcrypt to decode). if the Username and Password match, return true, else return false
  let login;

  try {
    login = await connection
      .promise()
      .query("SELECT password FROM userdetails WHERE username = ?", [Username]);
  } catch (err) {
    res.json({ code: "E201" });
    return;
  }

  // console.log(login);

  if (login[0] && login[0].length < 1) {
    res.json({ code: "E201" });
    return;
  }

  const hashedPassword = login[0][0].password;

  // Compare the entered password with the hashed password
  if (!comparePasswords(Password, hashedPassword)) {
    res.json({ code: "E201" });
    return;
  }

  let isactive;

  try {
    isactive = await connection
      .promise()
      .query("SELECT status FROM userdetails WHERE username = ?", [Username]);
  } catch (err) {
    res.json({ code: "E202" });
    return;
  }

  const userStatus = isactive[0][0].status;

  if (userStatus !== 1) {
    res.json({ code: "E202" });
    return;
  }

  let TaskIdExist;

  try {
    TaskIdExist = await connection
      .promise()
      .query("SELECT Task_app_Acronym FROM task WHERE Task_id = ?", [Task_id]);
  } catch (err) {
    res.json({ code: "E302" });
    return;
  }

  if (TaskIdExist[0] && TaskIdExist[0].length < 1) {
    res.json({ code: "E302" });
    return;
  }

  let applicationexist;

  try {
    // Query the database for the Task_app_Acronym
    const [rows] = await connection
      .promise()
      .query("SELECT App_Acronym FROM application WHERE App_Acronym = ?", [
        TaskIdExist[0][0].Task_app_Acronym,
      ]);

    // Check if the query returned any rows
    if (rows.length === 0) {
      // If no rows were returned, Task_app_Acronym does not exist in the database
      res.json({ code: "E301" });
      return;
    }

    // If rows were returned, Task_app_Acronym exists in the database
    applicationexist = rows;
  } catch (err) {
    // Handle any errors that occurred during the query
    res.json({ code: "E301" });
    return;
  }

  const groupName = await connection
    .promise()
    .query("SELECT App_permit_Doing FROM application WHERE App_Acronym = ?", [
      TaskIdExist[0][0].Task_app_Acronym,
    ]);
  const userId = Username;

  try {
    const isAdmin = await checkGroup(userId, groupName[0][0].App_permit_Doing);
    if (!isAdmin) {
      res.json({ code: "E303" });
      return;
    }
  } catch (err) {
    //console.error("Error checking group:", err);
    res.json({ code: "E303" });
    return;
  }

  let isDoing;

  try {
    const isDoing = await connection
      .promise()
      .query("SELECT Task_state FROM task WHERE Task_id = ?", [Task_id]);
    if (isDoing[0][0].Task_state !== 3) {
      res.json({ code: "E403" });
      return;
    }
  } catch (err) {
    res.json({ code: "E403" });
    return;
  }

  const username = Username;
  const stateindex = ["Open", "To-Do", "Doing", "Done", "Closed"];

  // Get the existing Task_state, Task_notes, Task_plan from the task table
  connection.query(
    "SELECT Task_state, Task_notes, Task_plan, Task_app_Acronym FROM task WHERE Task_id = ?",
    [Task_id],
    async (err, results) => {
      if (err) {
        res.json({ code: "E454" });
        return;
      }

      if (results.length < 1) {
        res.json({ code: "E454" });
        return;
      }

      const currentTaskState = results[0].Task_state;

      // Map the current state to the corresponding group in stateindex, 1=Open, 2=To-Do, 3=Doing, 4=Done, 5=Closed
      const currentTaskGroup = stateindex[currentTaskState - 1];
      const newTaskGroup = stateindex[currentTaskState];

      const currentTaskNotes = results[0].Task_notes;
      const currentTaskPlan = results[0].Task_plan;
      const Task_app_Acronym = results[0].Task_app_Acronym;
      const Task_notes = "";
      const Task_plan = "";

      let newTaskNotes = currentTaskNotes;

      if (Task_notes !== undefined && Task_notes !== "") {
        newTaskNotes = `-->>>--(Promoted from ${currentTaskGroup} to ${newTaskGroup})\nTask Notes: ${Task_notes}--<<<--~~>>>~~${Username}~~<<<~~==>>>==${currentTaskGroup}==<<<==++>>>++${new Date()}++<<<++${currentTaskNotes}`;
      } else {
        newTaskNotes = `-->>>--(Promoted from ${currentTaskGroup} to ${newTaskGroup})--<<<--~~>>>~~${Username}~~<<<~~==>>>==${currentTaskGroup}==<<<==++>>>++${new Date()}++<<<++${currentTaskNotes}`;
      }

      const newTaskState = currentTaskState + 1;

      let newTaskPlan = currentTaskPlan;

      if (Task_plan !== undefined && Task_plan !== "") {
        newTaskPlan = Task_plan;
      }

      connection.query(
        "UPDATE task SET Task_state = ?, Task_notes = ?, Task_owner = ?, Task_plan = ? WHERE Task_id = ?",
        [newTaskState, newTaskNotes, Username, newTaskPlan, Task_id],
        async (err, results) => {
          if (err) {
            res.json({ code: "E454" });
            return;
          }

          res.json({
            Task_id: Task_id,
            code: "S01",
          });

          if (newTaskState === 4) {
            const appRows = await connection
              .promise()
              .execute(
                "SELECT App_permit_Done FROM application WHERE App_Acronym = ?",
                [Task_app_Acronym]
              ); // Fetch the permitted groups for the "done" state of the application.
            const permittedGroup = appRows[0][0].App_permit_Done;
            const userRows = await connection
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

module.exports = { CreateTask, GetTaskbyState, PromoteTask2Done };
