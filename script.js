document.addEventListener('DOMContentLoaded', () => {

    // --- Top-Level State Variables ---
    let numberOfPlayers = 0;
    let currentPlayerSetupIndex = 0;
    let playerData = []; // Array to hold { name: 'P1', class: null } objects
    let selectedClasses = []; // Keep track of classes chosen so far in setup
    let currentGameState = {}; // Main object holding all game info
    let gameHistory = []; // Stores previous game states for Undo

    // --- Constants ---
    const AP_COST = {
        MOVE: 1, PIVOT: 1, SHOOT: 3, SILVER_BULLET: 3, THROW_HAZARD: 1, THROW_DYNAMITE: 2,
    };
    const DIRECTIONS = ['N', 'E', 'S', 'W'];
    const CLASS_DATA = {
        "Sheriff": {
            color: "color-sheriff",
            description: "A faction of Vampires enforcing order in a chaotic frontier.",
            abilities: [
                { name: "Under My Protection (Passive)", description: "The Sheriff shields nearby Bloodwells with an unholy vigilance, making them difficult targets." },
                { name: "Swift Justice (Passive)", description: "Justice waits for no dawn; one Sheriff presses forward relentlessly at the end of each turn." },
                { name: "Order Restored (Active, 1/game)", description: "(3 AP) Even death cannot stop the Sheriff's law; call back a fallen comrade from the abyss for one last stand." }
            ]
        },
        "Vigilante": {
            color: "color-vigilante",
            description: "A faction of Vampires seeking justice, using teamwork to punish wrongdoers.",
            abilities: [
                { name: "Side by Side (Passive)", description: "These Blood Brothers act as one, seamlessly sharing their actions and energy throughout the turn." },
                { name: "Blood Brothers (Passive)", description: "When fighting close together, their shared resolve grants them unnatural speed and an extra surge of action." },
                { name: "Vengeance is Mine (Active, 1/game)", description: "(0 AP) Harm my kin, feel my wrath! An attack fuels an overwhelming counter-assault next turn." }
            ]
        },
        "Outlaw": {
            color: "color-outlaw",
            description: "A faction of Vampires thriving on chaos, disrupting and escaping with speed.",
            abilities: [
                { name: "Daring Escape (Passive)", description: "Shoot, grin, and vanish! After hitting a Bloodwell, the Outlaw makes a swift, spectral getaway." },
                { name: "Hand Cannon (Active, 1/game)", description: "(5 AP) Unleash hellfire from a cursed Hand Cannon, tearing through foes and obstacles alike in a devastating line." },
                { name: "Rampage (Active, 1/game)", description: "(2 AP) A whirlwind of lead flies left and right as the Outlaw cuts loose!" }
            ]
        },
        "Bounty Hunter": {
            color: "color-bounty-hunter",
            description: "A faction of Vampires hunting for profit, using precision to eliminate targets.",
            abilities: [
                { name: "Sharpshooter (Passive)", description: "No cover is safe; the Hunter's cursed bullets find paths through solid stone." },
                { name: "Marked Man (Passive)", description: "Every bullet carries a hex, leaving wounded Vampires crippled with a debilitating curse." },
                { name: "Contract Payoff (Active, 1/game)", description: "(3 AP) Collecting the blood-price for a destroyed Bloodwell brings a surge of energy for the next hunt." }
            ]
        }
    };
    const LAYOUT_DATA = {
        '2': [
            { vampires: [ { player: 0, coord: 'A2', facing: 'S', id: 'P1V1' }, { player: 0, coord: 'C4', facing: 'S', id: 'P1V2' }, { player: 1, coord: 'A7', facing: 'N', id: 'P2V1' }, { player: 1, coord: 'C9', facing: 'N', id: 'P2V2' } ], bloodwells: [ { player: 0, coord: 'B1', id: 'P1BW1' }, { player: 0, coord: 'D3', id: 'P1BW2' }, { player: 0, coord: 'F2', id: 'P1BW3' }, { player: 1, coord: 'B6', id: 'P2BW1' }, { player: 1, coord: 'D8', id: 'P2BW2' }, { player: 1, coord: 'F7', id: 'P2BW3' } ], hazards: [ { type: 'Tombstone', coord: 'E5' }, { type: 'Carcass', coord: 'D5' }, { type: 'Grave Dust', coord: 'F5' }, { type: 'Tombstone', coord: 'G5' }, { type: 'Carcass', coord: 'E4' }, { type: 'Grave Dust', coord: 'E6' } ] },
        ],
        '3': [
             { vampires: [ { player: 0, coord: 'A2', facing: 'S', id: 'P1V1' }, { player: 0, coord: 'C4', facing: 'S', id: 'P1V2' }, { player: 1, coord: 'F2', facing: 'S', id: 'P2V1' }, { player: 1, coord: 'H4', facing: 'S', id: 'P2V2' }, { player: 2, coord: 'D8', facing: 'N', id: 'P3V1' }, { player: 2, coord: 'F9', facing: 'N', id: 'P3V2' } ], bloodwells: [ { player: 0, coord: 'B1', id: 'P1BW1' }, { player: 0, coord: 'D3', id: 'P1BW2' }, { player: 0, coord: 'A5', id: 'P1BW3' }, { player: 1, coord: 'G1', id: 'P2BW1' }, { player: 1, coord: 'I3', id: 'P2BW2' }, { player: 1, coord: 'G5', id: 'P2BW3' }, { player: 2, coord: 'C7', id: 'P3BW1' }, { player: 2, coord: 'E6', id: 'P3BW2' }, { player: 2, coord: 'G8', id: 'P3BW3' } ], hazards: [ { type: 'Tombstone', coord: 'E5' }, { type: 'Carcass', coord: 'D5' }, { type: 'Grave Dust', coord: 'F5' }, { type: 'Tombstone', coord: 'G5' }, { type: 'Carcass', coord: 'H5' }, { type: 'Grave Dust', coord: 'B7' } ] },
        ],
        '4': [
             { vampires: [ { player: 0, coord: 'A2', facing: 'S', id: 'P1V1' }, { player: 0, coord: 'C4', facing: 'S', id: 'P1V2' }, { player: 1, coord: 'F2', facing: 'S', id: 'P2V1' }, { player: 1, coord: 'H4', facing: 'S', id: 'P2V2' }, { player: 2, coord: 'A7', facing: 'N', id: 'P3V1' }, { player: 2, coord: 'C9', facing: 'N', id: 'P3V2' }, { player: 3, coord: 'F7', facing: 'N', id: 'P4V1' }, { player: 3, coord: 'H9', facing: 'N', id: 'P4V2' } ], bloodwells: [ { player: 0, coord: 'B1', id: 'P1BW1' }, { player: 0, coord: 'D3', id: 'P1BW2' }, { player: 0, coord: 'A3', id: 'P1BW3' }, { player: 1, coord: 'G1', id: 'P2BW1' }, { player: 1, coord: 'I3', id: 'P2BW2' }, { player: 1, coord: 'F3', id: 'P2BW3' }, { player: 2, coord: 'B6', id: 'P3BW1' }, { player: 2, coord: 'D8', id: 'P3BW2' }, { player: 2, coord: 'A8', id: 'P3BW3' }, { player: 3, coord: 'G6', id: 'P4BW1' }, { player: 3, coord: 'I8', id: 'P4BW2' }, { player: 3, coord: 'F8', id: 'P4BW3' } ], hazards: [ { type: 'Tombstone', coord: 'E5' }, { type: 'Carcass', coord: 'D5' }, { type: 'Grave Dust', coord: 'F5' }, { type: 'Tombstone', coord: 'G5' }, { type: 'Carcass', coord: 'E4' }, { type: 'Grave Dust', coord: 'E6' } ] },
             { vampires: [ { player: 0, coord: 'A2', facing: 'S', id: 'S1' }, { player: 0, coord: 'C3', facing: 'S', id: 'S2' }, { player: 1, coord: 'G2', facing: 'S', id: 'V1' }, { player: 1, coord: 'I3', facing: 'S', id: 'V2' }, { player: 2, coord: 'B8', facing: 'N', id: 'O1' }, { player: 2, coord: 'D7', facing: 'N', id: 'O2' }, { player: 3, coord: 'F8', facing: 'N', id: 'B1' }, { player: 3, coord: 'H7', facing: 'N', id: 'B2' } ], bloodwells: [ { player: 0, coord: 'B1', id: 'SBW1' }, { player: 0, coord: 'D2', id: 'SBW2' }, { player: 0, coord: 'A4', id: 'SBW3' }, { player: 1, coord: 'H1', id: 'VBW1' }, { player: 1, coord: 'F2', id: 'VBW2' }, { player: 1, coord: 'I4', id: 'VBW3' }, { player: 2, coord: 'C9', id: 'OBW1' }, { player: 2, coord: 'A7', id: 'OBW2' }, { player: 2, coord: 'D9', id: 'OBW3' }, { player: 3, coord: 'G9', id: 'BBW1' }, { player: 3, coord: 'I7', id: 'BBW2' }, { player: 3, coord: 'F9', id: 'BBW3' } ], hazards: [ { type: 'Tombstone', coord: 'D5' }, { type: 'Tombstone', coord: 'F5' }, { type: 'Carcass', coord: 'E4' }, { type: 'Carcass', coord: 'E6' }, { type: 'Grave Dust', coord: 'D4' }, { type: 'Grave Dust', coord: 'F6' } ] }
        ]
    };

    // --- DOM Element References ---
    const screens = { playerCount: document.getElementById('screen-player-count'), playerSetup: document.getElementById('screen-player-setup'), gameplay: document.getElementById('screen-gameplay'), };
    const popups = { elimination: document.getElementById('popup-elimination'), victory: document.getElementById('popup-victory'), };
    const playerCountButtons = screens.playerCount.querySelectorAll('button[data-count]');
    const playerSetupTitle = document.getElementById('player-setup-title');
    const playerNameLabel = document.getElementById('player-name-label');
    const playerNameInput = document.getElementById('input-player-name');
    const classSelectionContainer = document.getElementById('class-selection-buttons');
    const classButtons = classSelectionContainer.querySelectorAll('.btn-class');
    const classDetailsName = document.getElementById('class-name');
    const classDetailsDescription = document.getElementById('class-description');
    const classDetailsAbilities = document.getElementById('class-abilities');
    const classDetailsContainer = document.getElementById('class-details-container');
    const btnBack = document.getElementById('btn-back');
    const btnNext = document.getElementById('btn-next');
    const gameplayScreen = screens.gameplay;
    const actionBar = document.getElementById('action-bar');
    const gameBoard = document.getElementById('game-board');
    const playerInfoDisplay = document.getElementById('player-info');
    const currentClassDetailsName = document.getElementById('info-class-name');
    const currentClassDescription = document.getElementById('info-class-description');
    const currentClassAbilitiesList = document.getElementById('info-class-abilities');
    const infoSilverBullet = document.getElementById('info-silver-bullet');
    const statusBarPlayer = document.getElementById('status-player');
    const statusBarAP = document.getElementById('status-ap');
    const statusBarTurn = document.getElementById('status-turn');
    const btnUndo = document.getElementById('btn-undo');
    const btnEndTurn = document.getElementById('btn-end-turn');
    const btnToggleLog = document.getElementById('btn-toggle-log');
    const gameLog = document.getElementById('game-log');
    const logList = document.getElementById('log-list');
    const btnBackToSetup = document.getElementById('btn-back-to-setup');
    const btnShoot = document.getElementById('action-shoot');
    const btnThrow = document.getElementById('action-throw');
    const btnSilverBullet = document.getElementById('action-silver-bullet');
    const hazardPickerPopup = document.getElementById('hazard-picker');
    const hazardPickerOptions = document.getElementById('hazard-picker-options');
    const btnCancelThrow = document.getElementById('btn-cancel-throw');

    // --- END OF SECTION 1 ---

// --- Coordinate Helper Functions ---
function getRowColFromCoord(coord) { // e.g., "A1" -> { row: 1, col: 1 }
    if (!coord || coord.length < 2) return null;
    const colLetter = coord.charAt(0).toUpperCase();
    const rowNum = parseInt(coord.substring(1));
    if (isNaN(rowNum) || colLetter < 'A' || colLetter > 'I' || rowNum < 1 || rowNum > 9) {
        return null; // Invalid coord
    }
    return { row: rowNum, col: colLetter.charCodeAt(0) - 64 }; // A=1, B=2...
}

function getCoordFromRowCol(row, col) { // e.g., { row: 1, col: 1 } -> "A1"
    if (row < 1 || row > 9 || col < 1 || col > 9) return null;
    const colLetter = String.fromCharCode(64 + col);
    return `${colLetter}${row}`;
}

function getAdjacentCoord(coord, direction) { // direction = 'N', 'E', 'S', 'W'
    const rc = getRowColFromCoord(coord);
    if (!rc) return null;
    let { row, col } = rc;
    if (direction === 'N') row--;
    else if (direction === 'S') row++;
    else if (direction === 'E') col++;
    else if (direction === 'W') col--;
    return getCoordFromRowCol(row, col); // Will return null if off board
}

// Calculates distance between two coords (Manhattan distance)
function getDistance(coord1, coord2) {
    const rc1 = getRowColFromCoord(coord1);
    const rc2 = getRowColFromCoord(coord2);
    if (!rc1 || !rc2) return Infinity; // Cannot calculate if coords invalid
    return Math.abs(rc1.row - rc2.row) + Math.abs(rc1.col - rc2.col);
}

// --- UI Helper Functions ---

// Switches the visible screen
function showScreen(screenId) {
    Object.values(screens).forEach(screen => screen.classList.remove('active'));
    if (screens[screenId]) {
        screens[screenId].classList.add('active');
    } else {
        console.error(`Screen with id "${screenId}" not found.`);
    }
    console.log(`Showing screen: ${screenId}`);
}

// Displays details (including narrative ability descriptions) for setup
function displayClassDetails(className) {
    const data = CLASS_DATA[className];
    // Target setup elements specifically using the references defined earlier
    if (!classDetailsName || !classDetailsDescription || !classDetailsAbilities || !classDetailsContainer) {
        console.error("Setup class detail elements not found!"); return;
    }

    if (data) {
        classDetailsName.innerHTML = `<strong>Class:</strong> ${className}`;
        classDetailsDescription.textContent = data.description;
        classDetailsAbilities.innerHTML = ''; // Clear previous abilities
        data.abilities.forEach(ability => {
            const li = document.createElement('li');
            li.innerHTML = `<strong>${ability.name}:</strong> ${ability.description}`;
            classDetailsAbilities.appendChild(li);
        });
        classDetailsContainer.style.display = 'block';
    } else {
        classDetailsName.innerHTML = `<strong>Class:</strong> ---`;
        classDetailsDescription.textContent = 'Select a class above to see details.';
        classDetailsAbilities.innerHTML = '<li>---</li>';
        // Optionally hide container: containerElement.style.display = 'none';
    }
}

// Updates the player setup screen UI for the correct player
function updatePlayerSetupScreen(playerIndex) {
    const playerNum = playerIndex + 1;
    currentPlayerSetupIndex = playerIndex;

    console.log(`Setting up screen for Player ${playerNum}`);

    if (!playerData[playerIndex]) {
         playerData[playerIndex] = { name: `P${playerNum}`, class: null };
    } else {
        // Clear class selection when returning to setup screen for a player
        playerData[playerIndex].class = null;
    }
    // Set name input value: if player has a custom name use it, otherwise empty for placeholder
    playerNameInput.value = (playerData[playerIndex].name && playerData[playerIndex].name !== `P${playerNum}`) ? playerData[playerIndex].name : '';
    playerNameInput.placeholder = `P${playerNum} Name (Optional)`;
    playerSetupTitle.textContent = `Player ${playerNum} Setup`;
    playerNameLabel.textContent = `Player ${playerNum} Name:`;

    // Reset class button selection highlight
    let previouslySelectedButton = classSelectionContainer.querySelector('.selected');
    if (previouslySelectedButton) {
        previouslySelectedButton.classList.remove('selected');
    }
    // Update enabled/disabled state of class buttons
    classButtons.forEach(button => {
        const className = button.dataset.class;
        // Disable if class is in the list of classes selected by *other* players
        button.disabled = selectedClasses.includes(className);
        button.style.opacity = button.disabled ? '0.5' : '1';
    });

    displayClassDetails(null); // Reset details view

    // Show/Hide Back button
    btnBack.style.display = (playerIndex === 0) ? 'none' : 'inline-block';
    // Update Next/Start Game button text
    btnNext.textContent = (playerIndex === numberOfPlayers - 1) ? 'Start Game' : 'Next';
}

// Adds a message to the game log panel
function addToLog(message) {
    const li = document.createElement('li');
    li.textContent = message;
    // Limit log length
    while (logList.children.length > 50) {
         logList.removeChild(logList.firstChild);
    }
    logList.appendChild(li);
    // Auto-scroll to bottom
    if (gameLog && !gameLog.classList.contains('log-hidden')) { // Only scroll if visible
         gameLog.scrollTop = gameLog.scrollHeight;
    }
    console.log("Log:", message);
}

// Generates the 9x9 grid squares in the HTML
function generateGrid() {
    gameBoard.innerHTML = ''; // Clear existing grid
    for (let r = 1; r <= 9; r++) {
        for (let c = 1; c <= 9; c++) {
            const square = document.createElement('div');
            const colLetter = String.fromCharCode(64 + c);
            const coord = `${colLetter}${r}`;
            square.classList.add('grid-square');
            square.dataset.coord = coord;
            gameBoard.appendChild(square);
        }
    }
    console.log("Generated 9x9 grid.");
}

// Gets the CSS color class name for a given player index
function getPlayerColorClass(playerIndex) {
    // Check if game state and players array are initialized
    const player = currentGameState.players?.[playerIndex];
    if (player && player.class && CLASS_DATA[player.class]) {
        return CLASS_DATA[player.class].color || '';
    }
    return ''; // Return empty string if player/class/color not found
}

// Removes target highlighting classes from all grid squares
function clearHighlights() {
    document.querySelectorAll('.grid-square.valid-target, .grid-square.invalid-target').forEach(el => {
        el.classList.remove('valid-target', 'invalid-target');
    });
}

// --- END OF SECTION 2 ---

// --- Board Rendering & Gameplay UI Update Functions ---

    // Renders pieces on the board based on game state
    function renderBoard(gameState) {
        // console.log("Rendering board state..."); // Reduce console noise
        document.querySelectorAll('.piece').forEach(p => p.remove()); // Clear existing pieces

        if (!gameState || !gameState.board) { console.error("Render Error: Invalid game state provided."); return; }

        // Render Vampires
        gameState.board.vampires?.forEach(vamp => {
            const targetSquare = gameBoard.querySelector(`[data-coord="${vamp.coord}"]`);
            if (targetSquare) {
                const vampElement = document.createElement('div');
                const playerClass = gameState.players[vamp.player]?.class;
                const classColor = CLASS_DATA[playerClass]?.color || '';
                vampElement.classList.add('piece', 'vampire', classColor);
                vampElement.dataset.id = vamp.id; vampElement.dataset.player = vamp.player; vampElement.dataset.facing = vamp.facing;
                if (vamp.id === gameState.selectedVampireId) vampElement.classList.add('selected');
                if (vamp.cursed) vampElement.classList.add('cursed');
                targetSquare.appendChild(vampElement);
            } else {
                 console.warn(`Square not found for vampire ${vamp.id} at ${vamp.coord}`);
            }
        });

        // Render Bloodwells
        gameState.board.bloodwells?.forEach(bw => {
            const targetSquare = gameBoard.querySelector(`[data-coord="${bw.coord}"]`);
            if (targetSquare) {
                const bwElement = document.createElement('div');
                const playerClass = gameState.players[bw.player]?.class;
                const classColor = CLASS_DATA[playerClass]?.color || '';
                bwElement.classList.add('piece', 'bloodwell', classColor);
                bwElement.dataset.id = bw.id; bwElement.dataset.player = bw.player;
                bwElement.textContent = '🩸';
                targetSquare.appendChild(bwElement);
            } else {
                 console.warn(`Square not found for bloodwell ${bw.id} at ${bw.coord}`);
            }
        });

        // Render Hazards
        gameState.board.hazards?.forEach(hazard => {
            const targetSquare = gameBoard.querySelector(`[data-coord="${hazard.coord}"]`);
            if (targetSquare) {
                const hazardElement = document.createElement('div');
                hazardElement.classList.add('piece', 'hazard');
                const typeClass = `hazard-${hazard.type.toLowerCase().replace(' ','-')}`;
                hazardElement.classList.add(typeClass);
                let icon = '?';
                if (hazard.type === 'Tombstone') icon = '🪦'; else if (hazard.type === 'Carcass') icon = '💀'; else if (hazard.type === 'Grave Dust') icon = '💩'; else if (hazard.type === 'Dynamite') icon = '💥';
                hazardElement.textContent = icon;
                targetSquare.appendChild(hazardElement);
            } else {
                 console.warn(`Square not found for hazard at ${hazard.coord}`);
            }
        });
    }

    // Updates the player info panel during gameplay
    function updatePlayerInfoPanel(player, turn, currentAP, resources) {
        // Ensure elements exist before trying to update them
        if (!player || !resources || !currentClassDetailsName || !currentClassDescription || !currentClassAbilitiesList || !infoSilverBullet || !statusBarPlayer || !statusBarAP || !statusBarTurn) {
             console.error("Info Panel Error: One or more required elements not found or invalid data provided.");
             return; // Exit if essential elements/data are missing
        }

        // console.log(`Updating info panel for ${player.name}, Turn ${turn}, AP: ${currentAP}`); // Reduce noise
        const data = CLASS_DATA[player.class];
        if (data) {
            currentClassDetailsName.innerHTML = `<strong>Class:</strong> ${player.class}`;
            currentClassDescription.textContent = data.description; // Use the narrative description here too, or could fetch technical rules
            currentClassAbilitiesList.innerHTML = ''; // Clear previous abilities
            data.abilities.forEach(ability => {
                const li = document.createElement('li');
                // Check if the ability name exists in the player's used abilities list
                const isUsed = resources.abilitiesUsed?.includes(ability.name); // Use optional chaining for safety
                li.innerHTML = `<strong>${ability.name}:</strong> ${ability.description}`; // Display narrative desc
                if (isUsed) {
                    li.style.opacity = '0.5';
                    li.style.textDecoration = 'line-through';
                }
                // TODO: Add click listeners for *active* abilities if they should be clickable
                currentClassAbilitiesList.appendChild(li);
            });
        } else {
             // Handle case where class data might be missing
             currentClassDetailsName.innerHTML = `<strong>Class:</strong> ${player.class || 'Unknown'}`;
             currentClassDescription.textContent = "Class data not found.";
             currentClassAbilitiesList.innerHTML = '';
        }

        // Update Silver Bullet status
        infoSilverBullet.textContent = resources.silverBullet > 0 ? `Available (${resources.silverBullet})` : "Used";

        // Update Status Bar
        statusBarPlayer.textContent = player.name;
        statusBarAP.textContent = currentAP;
        statusBarTurn.textContent = turn;

        // Update Action Button States based on current game state
        const canAffordShoot = currentAP >= AP_COST.SHOOT;
        const canAffordThrowBase = currentAP >= AP_COST.THROW_HAZARD; // Need >= 1 AP even to consider throwing
        const canAffordSilver = currentAP >= AP_COST.SILVER_BULLET && resources.silverBullet > 0;
        const isVampSelected = !!currentGameState.selectedVampireId;
        const selectedVamp = findVampireById(currentGameState.selectedVampireId); // Find selected vampire object
        const isCursed = selectedVamp?.cursed; // Check if the selected vampire is cursed

        // Enable/disable buttons (ensure button references are valid)
        if (btnShoot) btnShoot.disabled = !isVampSelected || !canAffordShoot || isCursed;
        if (btnThrow) btnThrow.disabled = !isVampSelected || !canAffordThrowBase || isCursed; // Base check, specific cost checked later
        if (btnSilverBullet) btnSilverBullet.disabled = !isVampSelected || !canAffordSilver || isCursed;

        // TODO: Disable/enable other actions (Move, Pivot, Dispel, Class Actives) based on AP cost, selection, curse status, target validity etc.
        // Example: document.getElementById('action-move').disabled = !isVampSelected || currentAP < AP_COST.MOVE || isCursed;
    }

    // Central UI update function (calls updatePlayerInfoPanel)
    function updateUI() {
        if (!currentGameState || !currentGameState.players || !currentGameState.playerResources) {
            console.error("updateUI called with invalid game state.");
             return; // Exit if state is not ready
        }
        const currentPlayerIndex = currentGameState.currentPlayerIndex;
        // Check if index is valid for the arrays
        if (currentPlayerIndex < 0 || currentPlayerIndex >= currentGameState.players.length || currentPlayerIndex >= currentGameState.playerResources.length) {
            console.error("Error: currentPlayerIndex is out of bounds in updateUI.", currentGameState);
            return;
        }
        const currentPlayer = currentGameState.players[currentPlayerIndex];
        const currentResources = currentGameState.playerResources[currentPlayerIndex];
        // Check if player and resources are valid before calling update
        if (currentPlayer && currentResources) {
             updatePlayerInfoPanel(currentPlayer, currentGameState.turn, currentGameState.currentAP, currentResources);
        } else {
             console.error("Error fetching current player or resources in updateUI.");
        }
        // Note: renderBoard is called separately by functions that change board pieces
    }

    // --- END OF SECTION 3 ---

    // --- Game State, Undo & Piece Finding Functions ---

    // Saves a deep copy of the current state to history
    function saveStateToHistory() {
        try {
            // Create a deep copy of the game state using JSON methods
            const stateCopy = JSON.parse(JSON.stringify(currentGameState));
            gameHistory.push(stateCopy);
            // Limit history size if desired (e.g., keep last 10 states)
            // if (gameHistory.length > 10) gameHistory.shift();
            btnUndo.disabled = false; // Enable undo button now that there's history
            console.log("State saved. History length:", gameHistory.length);
        } catch (error) {
            // Handle potential errors during deep copy (e.g., circular references)
            console.error("Error saving game state:", error);
            alert("Error saving game state! Undo may not work correctly.");
        }
    }

    // Restores the previous game state from history
    function undoLastAction() {
        if (gameHistory.length > 0) {
            console.log("Undoing last action...");
            try {
                // Restore the previous state (it's already a deep copy from history)
                currentGameState = gameHistory.pop();

                // Re-render everything based on the restored state
                renderBoard(currentGameState);
                updateUI(); // Update info panel, button states etc.
                addToLog("--- Last Action Undone ---");

                // Disable undo if history is now empty
                btnUndo.disabled = gameHistory.length === 0;
            } catch (error) {
                console.error("Error restoring game state:", error);
                alert("Error restoring game state!");
                btnUndo.disabled = true; // Disable undo on error
            }
        } else {
            console.log("No actions in history to undo.");
            btnUndo.disabled = true; // Ensure button is disabled
        }
    }

    // --- Find Pieces in Game State ---

    // Finds a vampire object in the current state by its unique ID
    function findVampireById(vampId) {
        if (!vampId || !currentGameState.board?.vampires) {
            return null;
        }
        return currentGameState.board.vampires.find(v => v.id === vampId);
    }

    // Finds any piece (Vampire, Bloodwell, or Hazard) at a specific coordinate
    function findPieceAtCoord(coord) {
        if (!coord || !currentGameState?.board) return null;

        // Check for vampire first (visually on top)
        const vamp = currentGameState.board.vampires?.find(v => v.coord === coord);
        if (vamp) return { type: 'vampire', piece: vamp };

        // Check for bloodwell next
        const bw = currentGameState.board.bloodwells?.find(b => b.coord === coord);
        if (bw) return { type: 'bloodwell', piece: bw };

        // Check for hazard last
        const hazard = currentGameState.board.hazards?.find(h => h.coord === coord);
        if (hazard) return { type: 'hazard', piece: hazard };

        return null; // Empty square
    }

    // --- END OF SECTION 4 ---

    // --- Action Execution Functions ---

    function executeMove(vampire, targetCoord) {
        // --- Validation ---
        // 1. Check AP Cost
        if (currentGameState.currentAP < AP_COST.MOVE) { addToLog("Not enough AP to Move."); return false; } // Return false on failure
        // 2. Check if Cursed (Rule: only 1 square move per TURN)
        // TODO: Implement turn-based move limit for cursed vampires. This requires tracking moves made *this turn*.
        // For now, allow cursed move but log warning, rule not fully enforced.
        if (vampire.cursed) { addToLog("Warning: Cursed movement limit (1/turn) not fully enforced yet."); }
        // 3. Check target validity (must be adjacent IN FACING direction)
        const expectedTarget = getAdjacentCoord(vampire.coord, vampire.facing);
        if (targetCoord !== expectedTarget) {
             addToLog(`Invalid move target. Must move 1 square in facing direction (${vampire.facing}). Clicked ${targetCoord}, expected ${expectedTarget}.`);
             return false; // Return false on failure
        }
        // 4. Check target occupancy (Vamp, BW, Carcass block)
        const pieceAtTarget = findPieceAtCoord(targetCoord);
        if (pieceAtTarget && (pieceAtTarget.type === 'vampire' || pieceAtTarget.type === 'bloodwell' || (pieceAtTarget.type === 'hazard' && pieceAtTarget.piece.type === 'Carcass'))) {
             addToLog(`Cannot move onto square ${targetCoord} occupied by ${pieceAtTarget.piece.type}.`);
             return false; // Return false on failure
        }
        // --- End Validation ---

        saveStateToHistory(); // Save state *before* the move

        // Update state
        const oldCoord = vampire.coord;
        vampire.coord = targetCoord;
        currentGameState.currentAP -= AP_COST.MOVE;
        addToLog(`${vampire.id} moved ${oldCoord} -> ${targetCoord}. (${currentGameState.currentAP} AP left)`);

        // Check for landing effects
        if (pieceAtTarget?.type === 'hazard' && pieceAtTarget.piece.type === 'Grave Dust') {
            if (!vampire.cursed) {
                 vampire.cursed = true;
                 addToLog(`${vampire.id} landed on Grave Dust and is now CURSED!`);
            }
        }
        // Check for Bloodbath (landing on own BW to cure curse - check NO hazard)
        const landedOnBW = findPieceAtCoord(targetCoord)?.type === 'bloodwell';
        const isHazardAlsoPresent = findPieceAtCoord(targetCoord)?.type === 'hazard'; // Check if hazard is on the same square
        if (vampire.cursed && landedOnBW && !isHazardAlsoPresent && findPieceAtCoord(targetCoord).piece.player === vampire.player) {
            vampire.cursed = false;
             addToLog(`${vampire.id} performed Bloodbath at ${targetCoord} and is CURED!`);
        }

        // Update UI
        renderBoard(currentGameState);
        updateUI();
        return true; // Indicate success
    }

    function executePivot(vampire, newFacing) {
        if (!DIRECTIONS.includes(newFacing)) { console.error("Invalid pivot direction:", newFacing); return false; }
        if (currentGameState.currentAP < AP_COST.PIVOT) { addToLog("Not enough AP to Pivot."); return false; }
        // Cursed can pivot

        saveStateToHistory();

        vampire.facing = newFacing;
        currentGameState.currentAP -= AP_COST.PIVOT;
        addToLog(`${vampire.id} pivoted to face ${newFacing}. (${currentGameState.currentAP} AP left)`);
        renderBoard(currentGameState);
        updateUI();
        return true; // Indicate success
    }

    function executeShoot(vampire, isSilverBullet = false) {
        const cost = isSilverBullet ? AP_COST.SILVER_BULLET : AP_COST.SHOOT;
        if (currentGameState.currentAP < cost) { addToLog(`Not enough AP to ${isSilverBullet ? 'use Silver Bullet' : 'Shoot'}.`); return false; }
        if (vampire.cursed) { addToLog("Cursed vampires cannot shoot."); return false; }
        const playerResources = currentGameState.playerResources[vampire.player];
        if (isSilverBullet && playerResources.silverBullet <= 0) { addToLog("No Silver Bullet left."); return false; }

        saveStateToHistory(); // Save state *before* shooting

        const shooterPlayerIndex = vampire.player;
        const shooterClass = currentGameState.players[shooterPlayerIndex].class;
        let currentCoord = vampire.coord;
        let hitMessage = `Shot from ${vampire.coord} facing ${vampire.facing} travelled off board.`; // Default msg
        let shotHitSomething = false; // Flag to track if the shot actually hit anything significant

        addToLog(`${vampire.id} ${isSilverBullet ? 'fires a Silver Bullet' : 'shoots'} facing ${vampire.facing}...`);

        if (isSilverBullet) {
             playerResources.silverBullet--; // Decrement resource
        }
        currentGameState.currentAP -= cost; // Deduct AP

        // Trace path square by square
        for (let i = 0; i < 9; i++) { // Max 9 squares range possible
            const nextCoord = getAdjacentCoord(currentCoord, vampire.facing);
            if (!nextCoord) { // Fell off board
                hitMessage = `Shot from ${vampire.coord} went off the board.`;
                break;
            }
            currentCoord = nextCoord; // Advance check to next square

            const pieceAtCoord = findPieceAtCoord(currentCoord);
            if (pieceAtCoord) {
                const targetType = pieceAtCoord.type;
                const targetPiece = pieceAtCoord.piece;

                // 1. Check blocking hazards FIRST
                if (targetType === 'hazard' && (targetPiece.type === 'Tombstone' || targetPiece.type === 'Dynamite')) {
                     // Bounty Hunters ignore Tombstones
                     if (targetPiece.type === 'Tombstone' && shooterClass === 'Bounty Hunter') {
                        addToLog(`Passes through Tombstone at ${currentCoord} (Sharpshooter).`);
                        continue; // Shot continues
                     }
                     // TODO: Check Sheriff 'Under My Protection' if target is Dynamite adjacent to Sheriff? Assume Dynamite always blocks for now.
                     hitMessage = `Shot blocked by ${targetPiece.type} at ${currentCoord}.`;
                     shotHitSomething = true; // Blocked is significant
                     // Check if Dynamite explodes
                     if (targetPiece.type === 'Dynamite') {
                         hitMessage += ` Dynamite EXPLODES!`;
                         // --- TODO: Trigger Dynamite Explosion Logic ---
                         // Find dynamite object in state
                         const dynamiteIndex = currentGameState.board.hazards.findIndex(h => h.coord === currentCoord);
                         if (dynamiteIndex > -1) {
                            // Remove Dynamite from board state *first*
                            currentGameState.board.hazards.splice(dynamiteIndex, 1);
                            addToLog(`Dynamite removed from ${currentCoord}.`);
                             // TODO: Implement 3x3 area calculation and effects
                             // - Get adjacent squares
                             // - Remove other hazards in area
                             // - Destroy Bloodwells in area
                             addToLog("Dynamite explosion effect logic TBD.");
                         }
                         // --- End Dynamite Logic ---
                     }
                     break; // Stop shot path
                }

                // 2. Check target pieces if not blocked
                // Hit Vampire
                if (targetType === 'vampire') {
                    shotHitSomething = true;
                     if (isSilverBullet && targetPiece.player !== shooterPlayerIndex) {
                         hitMessage = `Silver Bullet HIT & ELIMINATED enemy ${targetPiece.id} at ${currentCoord}!`;
                         const targetPlayerIndex = targetPiece.player;
                         currentGameState.board.vampires = currentGameState.board.vampires.filter(v => v.id !== targetPiece.id);
                         // TODO: Check if targetPlayerIndex is now eliminated (no vamps OR no BWs)
                     } else if (shooterClass === 'Bounty Hunter' && targetPiece.player !== shooterPlayerIndex && !targetPiece.cursed) {
                         hitMessage = `Shot HIT enemy ${targetPiece.id} at ${currentCoord}. Target is CURSED (Marked Man)!`;
                         const targetVamp = findVampireById(targetPiece.id); // Modify the actual object in state
                         if(targetVamp) targetVamp.cursed = true;
                     } else {
                         hitMessage = `Shot hit ${targetPiece.id} at ${currentCoord} (no effect).`;
                     }
                     break; // Stop shot after hitting vampire
                }

                // Hit Bloodwell
                if (targetType === 'bloodwell') {
                    shotHitSomething = true;
                    // TODO: Check Sheriff 'Under My Protection' before destroying
                    // Logic: Find if any Sheriff vamp (player index matches targetPiece.player) is adjacent
                     hitMessage = `Shot DESTROYED Bloodwell ${targetPiece.id} at ${currentCoord}!`;
                     const targetPlayerIndex = targetPiece.player;
                     currentGameState.board.bloodwells = currentGameState.board.bloodwells.filter(bw => bw.id !== targetPiece.id);
                     // TODO: Check if targetPlayerIndex is now eliminated (no vamps OR no BWs)
                     break; // Stop shot after hitting bloodwell
                }

                // Pass through non-blocking hazards
                if (targetType === 'hazard' && (targetPiece.type === 'Carcass' || targetPiece.type === 'Grave Dust')) {
                     addToLog(`Shot passes through ${targetPiece.type} at ${currentCoord}.`);
                    // Shot continues through these
                }
            }
            // If square was empty, shot continues
        }

        // Final log message
        addToLog(hitMessage + ` (${currentGameState.currentAP} AP left)`);
        if (isSilverBullet && !shotHitSomething) { // Warn if SB missed important target
            addToLog("Silver Bullet did not eliminate an enemy vampire or destroy a bloodwell.");
        }

        renderBoard(currentGameState);
        updateUI();
        // TODO: Check win/loss conditions after shot resolution (player elimination)
        return true; // Indicate success
    }

    function executeThrow(vampire, hazardType, targetCoord) {
        const cost = hazardType === 'Dynamite' ? AP_COST.THROW_DYNAMITE : AP_COST.THROW_HAZARD;
        // Basic checks
        if (currentGameState.currentAP < cost) { addToLog(`Not enough AP to Throw ${hazardType}.`); return false; }
        if (vampire.cursed) { addToLog("Cursed vampires cannot throw hazards."); return false; }
        if (!currentGameState.hazardPool || (currentGameState.hazardPool[hazardType] || 0) <= 0) { addToLog(`No ${hazardType} left in the pool to throw.`); return false; }

        // --- Validation ---
        // 1. Distance (must be 1-3 squares away)
        const distance = getDistance(vampire.coord, targetCoord);
        if(distance <= 0 || distance > 3) { addToLog(`Invalid throw distance (${distance}). Must be 1-3 squares away.`); return false; }

        // 2. Target Occupancy Rules
        const pieceAtTarget = findPieceAtCoord(targetCoord);
        if(pieceAtTarget) { // Target square is occupied
             if (!(hazardType === 'Grave Dust' && pieceAtTarget.type === 'vampire')) {
                 // Can only target occupied square if throwing Grave Dust AT a Vampire
                 addToLog(`Cannot throw ${hazardType} onto occupied square ${targetCoord} containing a ${pieceAtTarget.type}.`);
                 return false;
             }
        } // Else: Target square is empty, which is generally required (except GD->Vamp)

        // 3. Clear Path (Simplified check - Assumes direct line for now)
        // TODO: Implement proper line-of-sight / path check
        // Iterate squares between vampire.coord and targetCoord.
        // Check for Vamps, BWs, Carcasses (these block throw path). Tombstone/Dynamite/GD do NOT block path.
        addToLog("Warning: Throw path validation not fully implemented yet."); // Placeholder warning

        // --- End Validation ---

        saveStateToHistory(); // Save state *before* throwing

        // Update State
        currentGameState.hazardPool[hazardType]--; // Decrement available pool count
        currentGameState.board.hazards.push({ type: hazardType, coord: targetCoord }); // Add hazard to board
        currentGameState.currentAP -= cost; // Deduct AP
        addToLog(`${vampire.id} threw ${hazardType} to ${targetCoord}. (${currentGameState.currentAP} AP left)`);

        // Apply effect if Grave Dust hits a Vampire
        if (hazardType === 'Grave Dust' && pieceAtTarget?.type === 'vampire') {
            const targetVamp = findVampireById(pieceAtTarget.piece.id); // Get the actual vampire object
            if (targetVamp && !targetVamp.cursed) {
                targetVamp.cursed = true;
                addToLog(`${targetVamp.id} was hit by thrown Grave Dust & is now CURSED!`);
            }
        }

        // Update UI
        renderBoard(currentGameState);
        updateUI();
        return true; // Indicate success
    }

     function nextTurn() {
         // Check if any actions are pending (like selecting throw target)
         if(currentGameState.actionState?.pendingAction){
             addToLog("Cannot end turn while an action is pending. Cancel or complete the action.");
             // Optionally auto-cancel? For now, require manual cancel.
              // btnCancelThrow.click(); // Example: Simulate cancel click if desired
             return;
         }

         // Save state before ending turn (allows undoing the 'end turn' itself if desired)
         saveStateToHistory();

         const previousPlayerIndex = currentGameState.currentPlayerIndex;
         const previousPlayer = currentGameState.players[previousPlayerIndex];

         // --- Apply end-of-turn effects ---
         // Example: Sheriff Swift Justice
         if (previousPlayer?.class === 'Sheriff' && !previousPlayer.eliminated) {
             // TODO: Implement logic to *allow player to choose* which Sheriff (if >1) gets free move.
             // For now, just log it as a reminder.
             addToLog("Sheriff's Swift Justice may apply (manual application needed).");
         }
         // TODO: Add other end-of-turn effects if any

         // Advance Player Index (Looping and skipping eliminated)
         let nextPlayerIndex = (previousPlayerIndex + 1) % numberOfPlayers;
         let loopCheck = 0;
         // Check if player data exists before checking eliminated status
         while (currentGameState.players[nextPlayerIndex]?.eliminated && loopCheck < numberOfPlayers) {
             nextPlayerIndex = (nextPlayerIndex + 1) % numberOfPlayers;
             loopCheck++;
         }
          // Check if only one player remains after looping (or if loop failed)
         const activePlayers = currentGameState.players.filter(p => !p.eliminated);
         if (activePlayers.length <= 1 && loopCheck >= numberOfPlayers) {
             console.error("Error: Could not find next active player! Possible game end state missed?");
             addToLog("Error advancing turn!");
             undoLastAction(); // Revert the end turn attempt
             return;
         }
         currentGameState.currentPlayerIndex = nextPlayerIndex;

         // Increment turn number if we wrapped around to player 0
         if (currentGameState.currentPlayerIndex === 0 && previousPlayerIndex !== 0) {
            // Only increment if we actually wrapped around (prevents increment on first P1 turn)
            currentGameState.turn++;
         }


         // Set AP for the new player
         const playerIndex = currentGameState.currentPlayerIndex;
         // Reset AP based on rules (Turn 1 has scaling)
         if (currentGameState.turn === 1) {
             if (numberOfPlayers === 4) currentGameState.currentAP = [4, 5, 6, 8][playerIndex];
             else if (numberOfPlayers === 3) currentGameState.currentAP = 6; // Rule was 6AP per player for 3P
             else if (numberOfPlayers === 2) currentGameState.currentAP = 5; // Rule was 5AP per player for 2P
         } else {
             currentGameState.currentAP = 5; // Standard AP for all turns after 1
         }
         // TODO: Add Vigilante Blood Brothers check here & potentially add +1 AP

         // Reset turn-specific state
         currentGameState.selectedVampireId = null;
         currentGameState.actionState = { pendingAction: null, selectedHazardType: null };
         clearHighlights(); // Ensure no lingering highlights

         // Manage Undo History - Disable undo at start of new turn.
         btnUndo.disabled = true;
         // Decide whether to clear history entirely on turn end or keep it
         // gameHistory = []; // Option to clear history each turn (simplifies)
         // For max flexibility let's keep history, player must undo *before* ending turn.

         // Update UI for new player
         renderBoard(currentGameState);
         updateUI();
         const currentPlayer = currentGameState.players[currentGameState.currentPlayerIndex];
         addToLog(`--- Turn ${currentGameState.turn} - ${currentPlayer.name}'s turn (${currentPlayer.class}). AP: ${currentGameState.currentAP} ---`);
         // TODO: Check Victory condition here (only 1 player not eliminated)
    }

    // --- END OF SECTION 5 ---
    
}); // End DOMContentLoaded
