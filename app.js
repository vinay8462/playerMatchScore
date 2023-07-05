const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const databasePath = path.join(__dirname, "cricketMatchDetails.db");

const app = express();

app.use(express.json());

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () =>
      console.log("Server Running at http://localhost:3000/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const convertPlayerDbObjectToResponseObject = (dbObject) => {
  return {
    playerId: dbObject.player_id,
    playerName: dbObject.player_name,
  };
};
const convertMatchDbObjectToResponseObject = (dbObject) => {
  return {
    matchId: dbObject.match_id,
    match: dbObject.match,
    year: dbObject.year,
  };
};
const convertPlayerMatchDbObjectToResponseObject = (dbObject) => {
  return {
    playerMatchId: dbObject.player_match_id,
    playerId: dbObject.player_id,
    matchId: dbObject.match_id,
    score: dbObject.score,
    fours: dbObject.fours,
    sixes: dbObject.sixes,
  };
};

app.get("/players/", async (request, response) => {
  const playersQuery = `
    SELECT *
    FROM player_details`;
  const playersDetails = await database.all(playersQuery);
  response.send(
    playersDetails.map((each) => convertPlayerDbObjectToResponseObject(each))
  );
});

app.get("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const playerQuery = `
  SELECT *
  FROM player_details
  WHERE player_id = ${playerId}`;
  const player = await database.get(playerQuery);
  response.send(player);
});

app.get("/matches/:matchId/", async (request, response) => {
  const { matchId } = request.params;
  const matchQuery = `
    SELECT *
    FROM match_details
    WHERE match_id = ${matchId}`;
  const matchDetails = await database.get(matchQuery);
  response.send(matchDetails);
});

app.put("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const { playerName } = request.body;
  const updatePlayerQuery = `
  UPDATE
    player_details
  SET 
    player_name = '${playerName}'
  WHERE player_id = ${playerId}`;
  await database.run(updatePlayerQuery);
  response.send("Player Details Updated");
});

app.get("/players/:playerId/matches", async (request, response) => {
  const { playerId } = request.params;
  const matchQuery = `
    SELECT *
    FROM player_match_score
    NATURAL JOIN match_details
    WHERE player_id = ${playerId}`;
  const matchDetails = await database.all(matchQuery);
  response.send(
    matchDetails.map((each) => convertMatchDbObjectToResponseObject(each))
  );
});

app.get("/matches/:matchId/players", async (request, response) => {
  const { matchId } = request.params;
  const matchQuery = `
    SELECT
	      player_details.player_id AS playerId,
	      player_details.player_name AS playerName
	    FROM player_match_score NATURAL JOIN player_details
        WHERE match_id=${matchId};`;
  const matchDetails = await database.all(matchQuery);
  response.send(matchDetails);
});

app.get("/players/:playerId/playerScores", async (request, response) => {
  const { playerId } = request.params;
  const matchQuery = `
    SELECT
    player_details.player_id AS playerId,
    player_details.player_name AS playerName,
    SUM(player_match_score.score) AS totalScore,
    SUM(fours) AS totalFours,
    SUM(sixes) AS totalSixes FROM 
    player_details INNER JOIN player_match_score ON
    player_details.player_id = player_match_score.player_id
    WHERE player_details.player_id = ${playerId};`;
  const matchDetails = await database.get(matchQuery);
  response.send(matchDetails);
});

module.exports = app;
