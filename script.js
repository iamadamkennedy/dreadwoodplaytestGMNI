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
    const btnMoveFwd = document.getElementById('action-move-fwd');
    const btnPivotL = document.getElementById('action-pivot-left');
    const btnPivotR = document.getElementById('action-pivot-right');
    const btnPivot180 = document.getElementById('action-pivot-180');


    // --- ADD THESE LOGS ---
    console.log("Move/Pivot Button DOM References:");
    console.log("btnMoveFwd:", btnMoveFwd);
    console.log("btnPivotL:", btnPivotL);
    console.log("btnPivotR:", btnPivotR);
    console.log("btnPivot180:", btnPivot180);
    // --- END OF ADDED LOGS ---


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

// Gets all 8 adjacent coordinates (N, E, S, W, NE, SE, SW, NW)
function getAllAdjacentCoords(coord) {
    const adjacentCoords = [];
    const rc = getRowColFromCoord(coord);
    if (!rc) return adjacentCoords; // Return empty if start coord invalid

    // Loop through row offsets (-1, 0, 1) and col offsets (-1, 0, 1)
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue; // Skip the center square itself

            const adjRow = rc.row + dr;
            const adjCol = rc.col + dc;
            const adjCoord = getCoordFromRowCol(adjRow, adjCol);

            if (adjCoord) { // Add if it's a valid coordinate on the board
                adjacentCoords.push(adjCoord);
            }
        }
    }
    return adjacentCoords;
}
// --- Coordinate Helper Functions ---

// Calculates new facing after pivoting
function getNewFacing(currentFacing, pivotType) { // pivotType = 'L', 'R', '180'
    const currentIndex = DIRECTIONS.indexOf(currentFacing);
    if (currentIndex === -1) return currentFacing; // Should not happen

    let newIndex;
    if (pivotType === 'L') {
        newIndex = (currentIndex - 1 + DIRECTIONS.length) % DIRECTIONS.length;
    } else if (pivotType === 'R') {
        newIndex = (currentIndex + 1) % DIRECTIONS.length;
    } else if (pivotType === '180') {
        newIndex = (currentIndex + 2) % DIRECTIONS.length;
    } else {
        return currentFacing; // Invalid pivot type
    }
    return DIRECTIONS[newIndex];
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
// Updates the player setup screen UI for the correct player (FIXED Back Button Bug)
function updatePlayerSetupScreen(playerIndex) {
    const playerNum = playerIndex + 1;
    currentPlayerSetupIndex = playerIndex; // Update global index

    console.log(`Setting up screen for Player ${playerNum}`);

    // Ensure player data slot exists, reset selected class for this player index
    if (!playerData[playerIndex]) {
         playerData[playerIndex] = { name: `P${playerNum}`, class: null };
    } else {
        playerData[playerIndex].class = null; // Reset class selection when revisiting this player's setup
    }

    // Set name input value
    playerNameInput.value = (playerData[playerIndex].name && playerData[playerIndex].name !== `P${playerNum}`) ? playerData[playerIndex].name : '';
    playerNameInput.placeholder = `P${playerNum} Name (Optional)`;

    // Update titles and labels
    playerSetupTitle.textContent = `Player ${playerNum} Setup`;
    playerNameLabel.textContent = `Player ${playerNum} Name:`;

    // --- Determine disabled classes based on OTHER players' choices ---
    const disabledClasses = [];
    for (let i = 0; i < numberOfPlayers; i++) {
         // If looking at a DIFFERENT player AND they have selected a class
         if (i !== playerIndex && playerData[i]?.class) {
             disabledClasses.push(playerData[i].class);
         }
    }
    // ---

    // Reset button states
    let previouslySelectedButton = classSelectionContainer.querySelector('.selected');
    if (previouslySelectedButton) {
        previouslySelectedButton.classList.remove('selected');
    }
    classButtons.forEach(button => {
        const className = button.dataset.class;
        // Disable button if class is in our calculated disabled list
        button.disabled = disabledClasses.includes(className);
        button.style.opacity = button.disabled ? '0.5' : '1';
        // Re-select the button if this player had previously chosen it (before going back/next)
        // Note: We reset playerData[playerIndex].class above, so this won't highlight on first load/back
        // if (playerData[playerIndex].class === className) {
        //     button.classList.add('selected');
        // }
    });

    displayClassDetails(null); // Reset details view initially

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
        if (currentGameState.currentAP < AP_COST.MOVE) { addToLog("Not enough AP to Move."); return false; }
        // Cursed Check (Enforces 1 move limit per turn)
        if (vampire.cursed) {
            if (vampire.movesThisTurn >= 1) {
                addToLog(`Cursed ${vampire.id} has already moved this turn. Cannot move again.`);
                return false; // Deny move
            }
            addToLog(`Cursed ${vampire.id} attempting its move for the turn.`);
        }
        // Target & Path Checks
        const expectedTarget = getAdjacentCoord(vampire.coord, vampire.facing);
        if (targetCoord !== expectedTarget) { addToLog(`Invalid move target. Must move 1 square forward (${vampire.facing}).`); return false; }
        const pieceAtTarget = findPieceAtCoord(targetCoord); // Check what's initially at the destination
        // Check for blocking pieces (Vamp, BW, Carcass) - This already prevents moving ONTO a Bloodwell
        if (pieceAtTarget && (pieceAtTarget.type === 'vampire' || pieceAtTarget.type === 'bloodwell' || (pieceAtTarget.type === 'hazard' && pieceAtTarget.piece.type === 'Carcass'))) {
             addToLog(`Cannot move onto square ${targetCoord} occupied by a ${pieceAtTarget.piece?.type || pieceAtTarget.type}.`); return false;
        }
        // --- End Validation ---

        saveStateToHistory(); // Save state *before* the move

        // --- Update State ---
        const oldCoord = vampire.coord;
        vampire.coord = targetCoord; // Move the vampire
        currentGameState.currentAP -= AP_COST.MOVE; // Deduct AP
        vampire.movesThisTurn = (vampire.movesThisTurn || 0) + 1; // Increment move counter

        addToLog(`${vampire.id} moved ${oldCoord} -> ${targetCoord}. (${currentGameState.currentAP} AP left)`); // Corrected log message

        // --- Check Landing Effects ---
        // 1. Landing on Grave Dust
        const hazardLandedOn = currentGameState.board.hazards.find(h => h.coord === targetCoord); // Check specifically for hazard on landing square
        if (hazardLandedOn?.type === 'Grave Dust' && !vampire.cursed) {
            console.log("Applying curse from landing on Grave Dust.");
             vampire.cursed = true;
             addToLog(`${vampire.id} landed on Grave Dust and is now CURSED!`);
        }

        // 2. Bloodbath Cure Check (NEW Adjacency Logic)
        if (vampire.cursed) { // Only check if the vampire was cursed when it moved
            console.log(`Checking Bloodbath for ${vampire.id} at ${targetCoord} (was cursed).`);
            const landedOnHazard = !!hazardLandedOn; // Did we land on *any* hazard?

            // Conditions: Landing square must be hazard-free AND adjacent to ANY Bloodwell
            if (!landedOnHazard) {
                 const adjacentCoords = getAllAdjacentCoords(targetCoord); // Use the new helper
                 let foundAdjacentBW = false;
                 let adjacentBWCoord = null;
                 for (const adjCoord of adjacentCoords) {
                      const pieceAtAdj = findPieceAtCoord(adjCoord);
                      if (pieceAtAdj?.type === 'bloodwell') {
                          foundAdjacentBW = true;
                          adjacentBWCoord = adjCoord; // Store which BW was adjacent for logging
                           console.log(`Found adjacent Bloodwell (${pieceAtAdj.piece.id}) at ${adjCoord}.`);
                          break; // Found one, no need to check others
                      }
                 }

                 // If landed on clean square AND adjacent to a bloodwell -> CURE
                 if (foundAdjacentBW) {
                     console.log("Bloodbath conditions MET (Adjacent)! Curing curse and resetting moves.");
                     vampire.cursed = false; // Lift the curse!
                     vampire.movesThisTurn = 0; // Reset move counter immediately upon cure
                     addToLog(`${vampire.id} performed Bloodbath by landing near ${adjacentBWCoord} at ${targetCoord} and is CURED!`);
                 } else {
                      // Log failure reason for debugging
                      console.log(`Bloodbath conditions NOT met. Landing square ${targetCoord} clean: ${!landedOnHazard}, Adjacent BW found: ${foundAdjacentBW}`);
                 }

            } else {
                 // Log failure reason for debugging
                 console.log(`Bloodbath cannot trigger: Landed on a hazard (${hazardLandedOn.type}) at ${targetCoord}.`);
            }
        }
        // --- End Landing Effects ---

        // Log final status after potential cure/curse
        console.log(`executeMove END for ${vampire.id}. Cursed: ${vampire.cursed}, MovesThisTurn: ${vampire.movesThisTurn}`);

        // Update UI
        renderBoard(currentGameState);
        updateUI();
        return true; // Indicate move success
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
        const startCoord = vampire.coord;
        const facing = vampire.facing;
        const distance = getDistance(startCoord, targetCoord);

        // 1. Distance & Direction Check
        let validDirectionAndDist = false;
        let currentCheckCoord = startCoord;
        for (let d = 1; d <= 3; d++) {
            currentCheckCoord = getAdjacentCoord(currentCheckCoord, facing);
            if (currentCheckCoord === targetCoord) {
                 if(d === distance) { // Ensure Manhattan matches steps in facing dir
                     validDirectionAndDist = true;
                 }
                break;
            }
            if (!currentCheckCoord) break; // Stop if off board
        }
        if (!validDirectionAndDist) {
            addToLog(`Invalid throw target. Must be 1-3 squares in facing direction (${facing}).`); return false;
        }

        // 2. Target Occupancy Rules
        const pieceAtTarget = findPieceAtCoord(targetCoord);
        if (pieceAtTarget) {
            if (!(hazardType === 'Grave Dust' && pieceAtTarget.type === 'vampire')) {
                addToLog(`Cannot throw ${hazardType} onto occupied square ${targetCoord} containing a ${pieceAtTarget.type}.`);
                return false;
            }
        } // Else: Target square is empty, which is generally required.

        // 3. Clear Path Check
        // Iterate from start+1 up to target-1, check for blocking pieces
        let pathClear = true;
        currentCheckCoord = startCoord;
        for (let d = 1; d < distance; d++) { // Check intermediate squares ONLY
             currentCheckCoord = getAdjacentCoord(currentCheckCoord, facing);
             if (!currentCheckCoord) { pathClear = false; break; } // Should not happen if targetCoord is valid, but safety check
             const pieceOnPath = findPieceAtCoord(currentCheckCoord);
             // Vamps, BWs, Carcasses block the path
             if (pieceOnPath && (pieceOnPath.type === 'vampire' || pieceOnPath.type === 'bloodwell' || pieceOnPath.piece.type === 'Carcass')) {
                 pathClear = false;
                 addToLog(`Throw path blocked by ${pieceOnPath.piece.type} at ${currentCheckCoord}.`);
                 break;
             }
        }
        if (!pathClear) {
             return false; // Path blocked, cannot execute throw
        }
        // --- End Validation ---


        // If Validation Passes:
        saveStateToHistory(); // Save state *before* throwing

        // Update State
        currentGameState.hazardPool[hazardType]--;
        currentGameState.board.hazards.push({ type: hazardType, coord: targetCoord });
        currentGameState.currentAP -= cost;
        addToLog(`${vampire.id} threw ${hazardType} to ${targetCoord}. (${currentGameState.currentAP} AP left)`);

        // Apply effect if Grave Dust hits a Vampire
        if (hazardType === 'Grave Dust' && pieceAtTarget?.type === 'vampire') {
            const targetVamp = findVampireById(pieceAtTarget.piece.id); // Get the actual vampire object
            if (targetVamp && !targetVamp.cursed) {
                targetVamp.cursed = true;
                addToLog(`${targetVamp.id} hit by thrown Grave Dust & is now CURSED!`);
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
            return;
        }

        // Save state before ending turn (allows undoing the 'end turn' itself)
        saveStateToHistory();

        const previousPlayerIndex = currentGameState.currentPlayerIndex;
        const previousPlayer = currentGameState.players[previousPlayerIndex];

        // --- Apply end-of-turn effects ---
        // Example: Sheriff Swift Justice
        if (previousPlayer?.class === 'Sheriff' && !previousPlayer.eliminated) {
            addToLog("Sheriff's Swift Justice may apply (Manual Check / UI TBD).");
            // TODO: Implement UI/logic for Swift Justice choice & execution
        }
        // TODO: Add other end-of-turn effects

        // Advance Player Index (Looping and skipping eliminated)
        let nextPlayerIndex = (previousPlayerIndex + 1) % numberOfPlayers;
        let loopCheck = 0;
        while (currentGameState.players[nextPlayerIndex]?.eliminated && loopCheck < numberOfPlayers) {
            nextPlayerIndex = (nextPlayerIndex + 1) % numberOfPlayers;
            loopCheck++;
        }
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
            currentGameState.turn++;
        }

       // Set AP for the new player
        const playerIndex = currentGameState.currentPlayerIndex;
        if (currentGameState.turn === 1) { // Only check turn 1 for scaling
            if (numberOfPlayers === 4) currentGameState.currentAP = [4, 5, 6, 8][playerIndex];
            else if (numberOfPlayers === 3) currentGameState.currentAP = 6;
            else if (numberOfPlayers === 2) currentGameState.currentAP = 5;
             else currentGameState.currentAP = 5; // Fallback for 1 player?
        } else {
            currentGameState.currentAP = 5; // Standard AP for all turns after 1
        }
        // TODO: Add Vigilante Blood Brothers check here & potentially add +1 AP

        // --- Reset turn-specific state ---
        currentGameState.selectedVampireId = null;
        currentGameState.actionState = { pendingAction: null, selectedHazardType: null };
        clearHighlights();
        btnUndo.disabled = true;
        // ** ADDED: Reset movesThisTurn for ALL vampires **
        if (currentGameState.board?.vampires) {
            currentGameState.board.vampires.forEach(v => v.movesThisTurn = 0);
        }
        // ** End Added Reset **
        // gameHistory = []; // Clearing history means cannot undo across turns

        // Update UI for new player
        renderBoard(currentGameState);
        updateUI();
        const currentPlayer = currentGameState.players[currentGameState.currentPlayerIndex];
        addToLog(`--- Turn ${currentGameState.turn} - ${currentPlayer.name}'s turn (${currentPlayer.class}). AP: ${currentGameState.currentAP} ---`);
        // TODO: Check Victory condition here (only 1 player not eliminated)
   }

    // --- END OF SECTION 5 ---

// --- Functions for Throw Action ---

    // Creates the buttons inside the hazard picker popup
    function populateHazardPicker() {
        hazardPickerOptions.innerHTML = ''; // Clear old options
        // Ensure currentGameState and its properties are valid before accessing
        if (!currentGameState || !currentGameState.hazardPool || typeof currentGameState.currentAP === 'undefined') {
            console.error("Cannot populate hazard picker: Invalid game state.");
            addToLog("Error preparing throw options.");
            return;
        }
        const pool = currentGameState.hazardPool;
        const ap = currentGameState.currentAP;

        // Helper to create each button
        const createButton = (type, icon, cost) => {
            const button = document.createElement('button');
            button.dataset.hazardType = type;
            // Ensure pool[type] exists, default to 0 if not
            const availableCount = pool[type] || 0;
            button.innerHTML = `<span class="hazard-icon">${icon}</span> ${type} <span class="hazard-cost">(${cost} AP)</span>`;
            // Disable if none available OR not enough AP
            button.disabled = availableCount <= 0 || ap < cost;
            button.title = `${availableCount} available`; // Add tooltip for count
            hazardPickerOptions.appendChild(button);
        };

        // Create buttons for each hazard type
        createButton('Tombstone', '🪦', AP_COST.THROW_HAZARD);
        createButton('Carcass', '💀', AP_COST.THROW_HAZARD);
        createButton('Grave Dust', '💩', AP_COST.THROW_HAZARD);
        createButton('Dynamite', '💥', AP_COST.THROW_DYNAMITE);
    }

    // Handles the click on a hazard type button in the picker
    function handleHazardSelection(hazardType) {
        console.log("Selected hazard:", hazardType);
        const cost = hazardType === 'Dynamite' ? AP_COST.THROW_DYNAMITE : AP_COST.THROW_HAZARD;
        // Double check conditions before proceeding
        if (!currentGameState || !currentGameState.hazardPool || !currentGameState.actionState) {
             console.error("Cannot handle hazard selection: Invalid game state."); return;
        }
        if ((currentGameState.hazardPool[hazardType] || 0) <= 0) { addToLog(`No ${hazardType} left.`); return; }
        if (currentGameState.currentAP < cost) { addToLog(`Not enough AP for ${hazardType}.`); return; }

        // Set the game state to expect a target selection
        currentGameState.actionState.pendingAction = 'throw-select-target';
        currentGameState.actionState.selectedHazardType = hazardType;
        hazardPickerPopup.style.display = 'none'; // Hide picker

        // Highlight valid target squares on the board
        highlightThrowTargets();
        addToLog(`Throwing ${hazardType}. Select a target square.`);
    }

    // Calculates and highlights valid squares for the selected throw action (FACING ONLY)
    function highlightThrowTargets() {
        clearHighlights(); // Clear previous highlights first
        const selectedVamp = findVampireById(currentGameState.selectedVampireId);
        // Ensure a vampire is selected and the action state is correctly set
        if (!selectedVamp || !currentGameState?.actionState?.selectedHazardType) return;

        const startCoord = selectedVamp.coord;
        const facing = selectedVamp.facing;
        const hazardType = currentGameState.actionState.selectedHazardType;
        let currentCoord = startCoord;
        let pathClear = true;

        // Check squares 1, 2, and 3 spaces away in the facing direction
        for (let dist = 1; dist <= 3; dist++) {
            const targetCoord = getAdjacentCoord(currentCoord, facing);

            if (!targetCoord) { // Off the board
                pathClear = false;
                break;
            }

            const pieceAtTarget = findPieceAtCoord(targetCoord);

            // Check if the path is blocked *before* this square (for dist 2 & 3)
            // Or if the target square itself is blocked for throwing *onto*
            if (!pathClear) break; // Stop if path was blocked earlier

            // Check for blocking pieces on the path or target square
            // Vamps, BWs, Carcasses always block the path/target (except GD onto Vamp)
            if (pieceAtTarget) {
                if (pieceAtTarget.type === 'vampire' || pieceAtTarget.type === 'bloodwell' || pieceAtTarget.piece.type === 'Carcass') {
                    // If throwing GD AT a vampire, this square IS valid, but path beyond is blocked
                    if (hazardType === 'Grave Dust' && pieceAtTarget.type === 'vampire' && dist <= 3) {
                        const targetSquareElement = gameBoard.querySelector(`[data-coord="${targetCoord}"]`);
                        if(targetSquareElement) targetSquareElement.classList.add('valid-target');
                        pathClear = false; // Path blocked beyond this square
                        addToLog(`Path blocked beyond ${targetCoord} by ${pieceAtTarget.type}`);
                        // Don't break yet, allow highlighting this square if it's the target
                    } else {
                        // Otherwise, this piece blocks throwing onto or through this square
                        pathClear = false;
                        addToLog(`Path blocked at ${targetCoord} by ${pieceAtTarget.type}`);
                        break; // Stop checking further
                    }
                }
                // Tombstones/Dynamite/GD do NOT block the *path* of a throw, only the landing spot if not GD->Vamp
                else if (pieceAtTarget.type === 'hazard' && (pieceAtTarget.piece.type === 'Tombstone' || pieceAtTarget.piece.type === 'Dynamite' || pieceAtTarget.piece.type === 'Grave Dust')) {
                    // Cannot land on these hazards, path is blocked for landing here
                    pathClear = false;
                    addToLog(`Cannot land on existing hazard at ${targetCoord}`);
                    // We check this square is invalid, but don't break, maybe next square is valid? Needs clear path rule clarification.
                    // Let's assume for now: if you hit non-passable hazard, you stop. If you hit passable, path continues but cannot land there.
                    // Let's adjust: If you hit ANY hazard (except GD->Vamp case), cannot land here. Path clear check needs refinement based on intermediate squares.

                    // --- Simplified approach for now: Only empty squares or Vamp(for GD) are valid targets ---
                    // If we hit any piece here, and it's not the GD->Vamp case, the square is not a valid target.
                    if (!(hazardType === 'Grave Dust' && pieceAtTarget.type === 'vampire')) {
                        // This square is not valid, but path might continue? Let's just mark invalid for now.
                            const targetSquareElement = gameBoard.querySelector(`[data-coord="${targetCoord}"]`);
                        if(targetSquareElement) targetSquareElement.classList.add('invalid-target'); // Mark as invalid landing
                        // Need to clarify rules: Does hitting a non-blocking hazard stop the throw entirely, or just prevent landing there?
                        // Assuming for now path continues, but cannot land here. So don't break pathClear.
                    } else {
                        // This is the GD->Vamp case, mark as valid target. Path blocked beyond.
                        const targetSquareElement = gameBoard.querySelector(`[data-coord="${targetCoord}"]`);
                        if(targetSquareElement) targetSquareElement.classList.add('valid-target');
                        pathClear = false; // Cannot throw *through* a vampire
                    }


                }
            }

            // If the path is still clear up to this point AND the target square is valid for landing
            const isOccupiable = !pieceAtTarget || (hazardType === 'Grave Dust' && pieceAtTarget.type === 'vampire');
            if (pathClear && isOccupiable) {
                const targetSquareElement = gameBoard.querySelector(`[data-coord="${targetCoord}"]`);
                if (targetSquareElement) {
                    targetSquareElement.classList.add('valid-target');
                }
            }

            // Prepare for next iteration
            currentCoord = targetCoord; // Move forward for next distance check
        }
    }

    // --- END OF SECTION 6 ---

    // --- Event Listener Handlers ---

    // Handles clicks on the game board (delegated from gameBoard element)
    // Handles clicks on the game board (delegated from gameBoard element)
    function handleBoardClick(event) {
        const clickedSquareElement = event.target.closest('.grid-square');
        if (!clickedSquareElement) return; // Click wasn't inside a square

        const clickedCoord = clickedSquareElement.dataset.coord;

        // Ensure game state is ready before processing clicks
        if (!currentGameState || !currentGameState.actionState) {
             console.error("Game state not ready for board click."); return;
        }
        const pendingAction = currentGameState.actionState.pendingAction;

        // --- Route click based on pending action ---
        if (pendingAction === 'throw-select-target') {
            const selectedHazardType = currentGameState.actionState.selectedHazardType;
            const selectedVamp = findVampireById(currentGameState.selectedVampireId);

            // IMPORTANT: Only execute if the clicked square was actually highlighted as valid
            if (clickedSquareElement.classList.contains('valid-target')) {
                // Validation should happen primarily within executeThrow now
                executeThrow(selectedVamp, selectedHazardType, clickedCoord);
            } else {
                addToLog("Invalid throw target selected. Action cancelled."); // Provide feedback
            }
            // Reset action state and clear highlights regardless of success/failure
            currentGameState.actionState = { pendingAction: null, selectedHazardType: null };
            clearHighlights();

        } else if (pendingAction === 'move-select-target') {
            // If Move required clicking target square:
             const selectedVamp = findVampireById(currentGameState.selectedVampireId);
            // Check if the square was valid before executing
            if (selectedVamp && clickedSquareElement.classList.contains('valid-target')) {
                 executeMove(selectedVamp, clickedCoord); // executeMove performs final checks
            } else {
                 addToLog("Invalid move target selected. Action cancelled.");
            }
             currentGameState.actionState = { pendingAction: null };
            clearHighlights();

        } else if (pendingAction === 'pivot-select-direction') {
             // Pivot action state might be handled by direction buttons instead of board click
             console.warn("Board clicked while waiting for pivot direction.");
             clearHighlights();
             currentGameState.actionState = { pendingAction: null }; // Reset state

        } else {
            // Default behavior: No action pending, handle Vampire selection/deselection
            handleVampireSelection(event);
        }
    }

    // Handles selecting/deselecting a vampire
    function handleVampireSelection(event) {
        // This function is now only called when no other action is pending
        const clickedVampireElement = event.target.closest('.vampire');

        if (clickedVampireElement) {
            // Clicked on a vampire piece
            const vampireId = clickedVampireElement.dataset.id;
            const ownerIndex = parseInt(clickedVampireElement.dataset.player);

            // Check if it belongs to the current player
            if (ownerIndex === currentGameState.currentPlayerIndex) {
                // Clicked own vampire - select it if not already selected
                if (currentGameState.selectedVampireId !== vampireId) {
                    console.log(`Selected vampire ${vampireId}`);
                    currentGameState.selectedVampireId = vampireId;
                    renderBoard(currentGameState); // Update selection highlight
                    updateUI(); // Update button states
                }
                // If clicking the already selected vampire, maybe deselect? Or do nothing.
                // else { currentGameState.selectedVampireId = null; renderBoard... updateUI... }

            } else {
                // Clicked opponent's vampire
                addToLog("Cannot select opponent's vampire.");
                // Deselect currently selected friendly vampire if any
                 if (currentGameState.selectedVampireId) {
                     currentGameState.selectedVampireId = null;
                     renderBoard(currentGameState);
                     updateUI();
                 }
            }
        } else if (event.target.classList.contains('grid-square')) {
            // Clicked on an empty square (or hazard/BW) - deselect current vampire
            if (currentGameState.selectedVampireId) {
                console.log("Deselecting vampire by clicking elsewhere.");
                currentGameState.selectedVampireId = null;
                renderBoard(currentGameState); // Re-render to remove highlight
                updateUI();
                clearHighlights(); // Clear any potential lingering highlights
            }
        }
    }


    // --- Initialization ---
    // --- Initialization ---
    function initializeGame() {
        console.log("Initializing game...");
        gameHistory = []; // Clear history for new game

        // 1. Select Layout
        const layoutsForPlayerCount = LAYOUT_DATA[numberOfPlayers];
        if (!layoutsForPlayerCount || layoutsForPlayerCount.length === 0) {
            alert(`Error: No layouts defined for ${numberOfPlayers} players! Cannot start game.`);
            console.error(`No layouts found for ${numberOfPlayers} players!`);
            showScreen('playerCount');
            return;
        }
        const layoutIndex = Math.floor(Math.random() * layoutsForPlayerCount.length);
        const selectedLayout = layoutsForPlayerCount[layoutIndex];
        const layoutName = `${numberOfPlayers}P Layout #${layoutIndex + 1}`;
        // addToLog(`Selected ${layoutName}`); // Log added later after init
        console.log(`Selected ${layoutName}`);

        // 2. Set up initial game state structure
        currentGameState = {
            players: playerData.map(p => ({ name: p.name, class: p.class, eliminated: false })),
            board: {
                 // Add cursed and movesThisTurn properties during initialization
                 vampires: JSON.parse(JSON.stringify(selectedLayout.vampires.map(v => ({
                     ...v,
                     cursed: false,
                     movesThisTurn: 0 // <-- ADDED: Initialize move counter
                    })))),
                 bloodwells: JSON.parse(JSON.stringify(selectedLayout.bloodwells)),
                 hazards: JSON.parse(JSON.stringify(selectedLayout.hazards))
            },
            hazardPool: {
                 'Tombstone': 4 - (selectedLayout.hazards.filter(h=>h.type==='Tombstone').length),
                 'Carcass': 4 - (selectedLayout.hazards.filter(h=>h.type==='Carcass').length),
                 'Grave Dust': 4 - (selectedLayout.hazards.filter(h=>h.type==='Grave Dust').length),
                 'Dynamite': 3
             },
            playerResources: playerData.map(() => ({
                silverBullet: 1,
                abilitiesUsed: []
            })),
            turn: 1,
            currentPlayerIndex: 0,
            currentAP: 0, // Will be set below
            selectedVampireId: null,
            actionState: {
                 pendingAction: null,
                 selectedHazardType: null
            }
            // History managed separately
        };

        // 3. Set Initial AP
        const playerIndex = currentGameState.currentPlayerIndex;
         if (currentGameState.turn === 1) {
             if (numberOfPlayers === 4) currentGameState.currentAP = [4, 5, 6, 8][playerIndex];
             else if (numberOfPlayers === 3) currentGameState.currentAP = 6;
             else if (numberOfPlayers === 2) currentGameState.currentAP = 5;
         } else {
             currentGameState.currentAP = 5; // Should not happen on init
         }

        // 4. Initial Render & UI Update
        generateGrid();
        renderBoard(currentGameState);
        const currentPlayer = currentGameState.players[currentGameState.currentPlayerIndex];
        if (!currentPlayer) { console.error("Init failed, no current player."); return; }
        const currentResources = currentGameState.playerResources[currentGameState.currentPlayerIndex];
        updatePlayerInfoPanel(currentPlayer, currentGameState.turn, currentGameState.currentAP, currentResources);

        logList.innerHTML = `<li>Game Started with ${layoutName}</li>`; // Reset log
        gameLog.scrollTop = 0;
        btnUndo.disabled = true;

        // 5. Add/Update Gameplay Event Listeners
        gameBoard.removeEventListener('click', handleBoardClick); // Ensure no duplicates if re-initializing
        gameBoard.addEventListener('click', handleBoardClick);
        btnUndo.removeEventListener('click', undoLastAction);
        btnUndo.addEventListener('click', undoLastAction);
        btnEndTurn.removeEventListener('click', nextTurn);
        btnEndTurn.addEventListener('click', nextTurn);
        // Action button listeners are attached globally once

        // 6. Show Gameplay Screen
        showScreen('gameplay');
        addToLog(`--- Turn ${currentGameState.turn} - ${currentPlayer.name}'s turn (${currentPlayer.class}). AP: ${currentGameState.currentAP} ---`);
    }


    // --- Attach Event Listeners (Executed ONCE after all functions defined) ---

    // Setup Screens Listeners
    playerCountButtons.forEach(button => button.addEventListener('click', () => { numberOfPlayers = parseInt(button.dataset.count); playerData = new Array(numberOfPlayers); selectedClasses = []; updatePlayerSetupScreen(0); showScreen('playerSetup'); }));
    classButtons.forEach(button => button.addEventListener('click', () => { if (button.disabled) return; let sel = classSelectionContainer.querySelector('.selected'); if (sel) sel.classList.remove('selected'); button.classList.add('selected'); const cls = button.dataset.class; if (playerData[currentPlayerSetupIndex]) playerData[currentPlayerSetupIndex].class = cls; displayClassDetails(cls); }));
    playerNameInput.addEventListener('input', () => { if(playerData[currentPlayerSetupIndex]) playerData[currentPlayerSetupIndex].name = playerNameInput.value.trim() || `P${currentPlayerSetupIndex + 1}`; });
    // Back Button (Player Setup) Listener - FIXED
    btnBack.addEventListener('click', () => {
        console.log("Back button clicked");
        // We no longer need to manually remove classes from selectedClasses array

        if (currentPlayerSetupIndex > 0) {
            // Go back to previous player's setup
            updatePlayerSetupScreen(currentPlayerSetupIndex - 1);
        } else {
            // Go back to player count selection
            playerData = []; // Clear player data when going back to start
            showScreen('playerCount');
        }
    });
    // Next / Start Game Button Listener - FIXED
btnNext.addEventListener('click', () => {
    console.log("Next/Start Game button clicked");
    const currentPlayerData = playerData[currentPlayerSetupIndex];

    if (!currentPlayerData) { console.error("Error: Player data not initialized for index", currentPlayerSetupIndex); return; }

    // Validate: Class must be selected
    if (!currentPlayerData.class) {
        alert(`Please select a class for Player ${currentPlayerSetupIndex + 1}!`);
        return;
    }

     // Ensure name is set (even if default)
     if (!currentPlayerData.name) {
         currentPlayerData.name = playerNameInput.placeholder || `P${currentPlayerSetupIndex + 1}`;
     }

    // We no longer need to manually add to selectedClasses array here

    // Check if more players need setup
    if (currentPlayerSetupIndex < numberOfPlayers - 1) {
        // Move to next player's setup
        updatePlayerSetupScreen(currentPlayerSetupIndex + 1);
    } else {
        // Last player, start the game
         initializeGame();
    }
});

    // --- Event Listener Handlers --- // (Functions like handleBoardClick, handleVampireSelection are defined earlier)

    // --- Initialization --- // (initializeGame function defined earlier)

    // --- Attach Event Listeners (Executed ONCE after all functions defined) ---

    // Setup Screens Listeners (These attach correctly when the script loads)
    playerCountButtons.forEach(button => button.addEventListener('click', () => { numberOfPlayers = parseInt(button.dataset.count); playerData = new Array(numberOfPlayers); selectedClasses = []; updatePlayerSetupScreen(0); showScreen('playerSetup'); }));
    classButtons.forEach(button => button.addEventListener('click', () => { if (button.disabled) return; let sel = classSelectionContainer.querySelector('.selected'); if (sel) sel.classList.remove('selected'); button.classList.add('selected'); const cls = button.dataset.class; if (playerData[currentPlayerSetupIndex]) playerData[currentPlayerSetupIndex].class = cls; displayClassDetails(cls); }));
    playerNameInput.addEventListener('input', () => { if(playerData[currentPlayerSetupIndex]) playerData[currentPlayerSetupIndex].name = playerNameInput.value.trim() || `P${currentPlayerSetupIndex + 1}`; });
    btnBack.addEventListener('click', () => { /* ... (Simplified logic from previous step, removing selectedClasses) ... */ if (currentPlayerSetupIndex > 0) updatePlayerSetupScreen(currentPlayerSetupIndex - 1); else { playerData = []; showScreen('playerCount'); } }); // Simplified: Doesn't need to track selectedClasses manually
    btnNext.addEventListener('click', () => { /* ... (Simplified logic from previous step, removing selectedClasses) ... */ const data = playerData[currentPlayerSetupIndex]; if (!data || !data.class) { alert(`Select class for P${currentPlayerSetupIndex + 1}!`); return; } if (!data.name) data.name = `P${currentPlayerSetupIndex + 1}`; if (currentPlayerSetupIndex < numberOfPlayers - 1) updatePlayerSetupScreen(currentPlayerSetupIndex + 1); else initializeGame(); });

    // Gameplay Screen Listeners (Attached ONCE when script loads)
    btnToggleLog.addEventListener('click', () => { gameLog.classList.toggle('log-hidden'); });
    btnBackToSetup.addEventListener('click', () => { if (confirm("Return to setup? Game progress will be lost.")) { /* Reset logic */ numberOfPlayers = 0; currentPlayerSetupIndex = 0; playerData = []; selectedClasses = []; currentGameState = {}; gameHistory = []; console.log("Returning to setup - game state cleared."); showScreen('playerCount'); } });

    // --- ADDED DEBUG LOG HERE ---
    console.log(">>> Attaching Action Button Listeners now...");
    // --- END OF ADDED DEBUG LOG ---

    // Action Buttons listeners (Attached ONCE when script loads)
    if(btnMoveFwd) btnMoveFwd.addEventListener('click', () => {
        console.log("Move Fwd button CLICKED"); // Keep this debug log
        const vamp = findVampireById(currentGameState.selectedVampireId);
        if (vamp) {
            const targetCoord = getAdjacentCoord(vamp.coord, vamp.facing);
            if (targetCoord) {
                executeMove(vamp, targetCoord); // Call the execute function
            } else {
                addToLog("Cannot move forward off the board.");
            }
        } else { addToLog("Select Vampire to Move."); }
    });

    if(btnPivotL) btnPivotL.addEventListener('click', () => {
         console.log("Pivot Left button CLICKED"); // Keep this debug log
         const vamp = findVampireById(currentGameState.selectedVampireId);
         if (vamp) {
            const newFacing = getNewFacing(vamp.facing, 'L');
            executePivot(vamp, newFacing); // Call the execute function
        } else { addToLog("Select Vampire to Pivot."); }
    });

     if(btnPivotR) btnPivotR.addEventListener('click', () => {
         console.log("Pivot Right button CLICKED"); // Keep this debug log
         const vamp = findVampireById(currentGameState.selectedVampireId);
         if (vamp) {
            const newFacing = getNewFacing(vamp.facing, 'R');
            executePivot(vamp, newFacing); // Call the execute function
        } else { addToLog("Select Vampire to Pivot."); }
    });

     if(btnPivot180) btnPivot180.addEventListener('click', () => {
         console.log("Pivot 180 button CLICKED"); // Keep this debug log
         const vamp = findVampireById(currentGameState.selectedVampireId);
         if (vamp) {
            const newFacing = getNewFacing(vamp.facing, '180');
            executePivot(vamp, newFacing); // Call the execute function
        } else { addToLog("Select Vampire to Pivot."); }
    });

    // Existing Action Button Listeners
    btnShoot.addEventListener('click', () => { const vamp = findVampireById(currentGameState.selectedVampireId); if (vamp) executeShoot(vamp, false); else addToLog("Select Vampire to Shoot."); });
    btnSilverBullet.addEventListener('click', () => { const vamp = findVampireById(currentGameState.selectedVampireId); if(!currentGameState || !currentGameState.playerResources) return; const res = currentGameState.playerResources[currentGameState.currentPlayerIndex]; if (vamp && res.silverBullet > 0) { if (confirm("Use Silver Bullet?")) executeShoot(vamp, true); } else if (!vamp) addToLog("Select Vampire to use Silver Bullet."); else addToLog("No Silver Bullet left."); });
    btnThrow.addEventListener('click', () => { const vamp = findVampireById(currentGameState.selectedVampireId); if (!vamp) { addToLog("Select Vampire to Throw."); return; } if (vamp.cursed) { addToLog("Cursed cannot throw."); return; } if (!currentGameState || typeof currentGameState.currentAP === 'undefined' || currentGameState.currentAP < AP_COST.THROW_HAZARD) { addToLog("Not enough AP to initiate Throw."); return; } populateHazardPicker(); hazardPickerPopup.style.display = 'flex'; currentGameState.actionState.pendingAction = 'throw-select-hazard'; addToLog("Select hazard type to throw."); });
    btnCancelThrow.addEventListener('click', () => { hazardPickerPopup.style.display = 'none'; currentGameState.actionState = { pendingAction: null, selectedHazardType: null }; clearHighlights(); addToLog("Throw cancelled."); });
    hazardPickerOptions.addEventListener('click', (event) => { const btn = event.target.closest('button'); if (btn?.dataset.hazardType) handleHazardSelection(btn.dataset.hazardType); });
    // Note: Listeners for board clicks, Undo, and EndTurn are attached inside initializeGame


    // --- Initial Load ---
    showScreen('playerCount'); // Start the application by showing the player count selection

}); // End DOMContentLoaded
