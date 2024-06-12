const objIdSchema = require("./modules/validationSchemas").objectIdSchema;
const ObjectId = require("./modules/databaseConnection").ObjectId;
const { getUsername, getUserId } = require("./modules/localSession");
const userCard = require("./modules/userCard").userCard;
const databases = require("./modules/databaseConnection").databases;
const { skillCatCollection, userSkillsCollection, userCollection } = databases;

/**
 * Removes a skill from the users profile in Mongo
 * @param {Request} req
 * @param {Response} res
 */
async function removeSkill(req, res) {
  let userId = getUserId(req);
  let skillId = req.params.skillID;
  let validationResults = validateUserAndSkillIds(userId, skillId);

  if (validationResults.length != 0) {
    //! CB: Unsure why this reroutes to /
    //! also unsure what errors is meant to do be doing here, or where its initialized.
    validationResults.forEach((result) => {
      errors.push(result);
    });
    res.redirect("/");
  } else {
    await userCollection.updateOne(
      { _id: ObjectId.createFromHexString(userId) },
      { $pull: { userSkills: ObjectId.createFromHexString(skillId) } }
    );
    res.redirect("back");
  }
}

/**
 *
 * @param {String} userId a hex string
 * @param {String} skillId a hex string
 * @returns {Array} errors An array containing all found errors; empty if none were found
 */
function validateUserAndSkillIds(userId, skillId) {
  let userValidation = objIdSchema.validate({ userId });
  let skillValidation = objIdSchema.validate({ skillId });

  let errors = [][(userValidation, skillValidation)].forEach((result) => {
    if (result != null) {
      errors.push(validationResult.error.details[0].message);
    }
  });

  return errors;
}

async function addSkill(req, res) {
  let userId = getUserId(req);
  let skillId = req.params.skillID;
  let validationResults = validateUserAndSkillIds(userId, skillId);

  if (validationResults.length != 0) {
    validationResults.forEach((result) => {
      errors.push(result);
    });
    res.redirect("/");
  } else {
    await userCollection.updateOne(
      { _id: ObjectId.createFromHexString(userId) },
      { $addToSet: { userSkills: ObjectId.createFromHexString(skillId) } }
    );
    res.redirect("back");
  }
}

/**
 * @param {ObjectId} skillID
 * @param {ObjectId} userID
 */
async function removeSkillFromUser(userID, skillID) {
  await userCollection.updateOne(
    { _id: userID },
    { $pull: { userSkills: skillID } }
  );
}

/**
 * @param {ObjectId} skillID
 * @param {ObjectId} userID
 */
async function addSkillToUser(userID, skillID) {
  await userCollection.updateOne(
    { _id: userID },
    { $addToSet: { userSkills: skillID } }
  );
}

async function loadSkillPage(req, res) {
  if (getUserId(req) == null) {
    //CB: Currently we need to redirect to login because an un-logged-in user wont have a username, so it would crash some of the logic on the skills page.
    // We should try to refactor that out at some point.
    res.redirect("../login");
    return;
  }
  let skill = req.params.skill;

  const skillDb = await userSkillsCollection.findOne({
    name: skill,
  });

  if (skillDb == null) {
    res.redirect("/404");
    return;
  } else if (skillDb.name == "Chronoscope Repair") {
    app.locals.modalLinks.push({ name: "Zamn!", link: "/zamn" });
  }
  var username = getUsername(req);
  let skilledUsers = await databases.getUsersWithSkill(skillDb._id);
  let skilledUsersCache = generateUserCards(skilledUsers);
  res.render("skill", {
    username: username,
    db: skilledUsersCache,
    skillName: skillDb.name,
    skillImage: skillDb.image,
    skillObjID: skillDb._id,
    referrer: req.get("referrer"),
  });
}

/**
 * Generates an array of userCards for skilled users.
 * @param {Document[]} skilledUsers
 * @returns {userCard[]} userCards
 */
function generateUserCards(skilledUsers) {
  let userCards = [];
  for (const user of skilledUsers) {
    userCards.push(
      new userCard(
        user.username,
        [],
        user.email,
        user.userIcon,
        user.userLocation,
        typeof user.rateValue !== "undefined" ? user.rateValue : null,
        typeof user.rateCount !== "undefined" ? user.rateCount : null
      )
    );
  }
  return userCards;
}

async function loadSkillCat(req, res) {
  var username = getUsername(req);
  const category = await skillCatCollection.findOne({
    name: req.params.skillCat,
  });
  /* 
    CB: the await here is the secret sauce!
    https://www.mongodb.com/docs/drivers/node/current/fundamentals/crud/read-operations/project/#std-label-node-fundamentals-project
    */
  let skills = await databases.getSkillsInCat(category.catSkills);
  res.render("category", {
    username: username,
    db: skills,
    parentPage: "/skill",
    catName: category.name,
    catImage: category.image,
  });
  return;
}

module.exports = { removeSkill, addSkill, loadSkillPage, loadSkillCat };
