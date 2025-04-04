document.addEventListener('DOMContentLoaded', () => {
    // --- State Variables ---
    let numberOfPlayers = 0;
    let currentPlayerSetupIndex = 0; // 0-based index for player being set up
    let playerData = []; // Array to hold { name: 'P1', class: null } objects
    let selectedClasses = []; // Keep track of classes chosen so far in setup
    // --- Game State (Main object holding all game info) ---
    let currentGameState = {};
    // --- History for Undo ---
    let gameHistory = []; // Stores previous game states for Undo

    // --- Constants ---
    const AP_COST = {
        MOVE: 1,
        PIVOT: 1,
        SHOOT: 3,
        SILVER_BULLET: 3,
        THROW_HAZARD: 1, // Base cost for Tombstone, Carcass, Grave Dust
        THROW_DYNAMITE: 2,
        // Add other action costs (Dispel, Bite Fuse, Abilities) here later
    };
    const DIRECTIONS = ['N', 'E', 'S', 'W'];

    // --- DOM Element References ---
    // (Screens, Popups, Setup Elements)
    const screens = {
        playerCount: document.getElementById('screen-player-count'),
        playerSetup: document.getElementById('screen-player-setup'),
        gameplay: document.getElementById('screen-gameplay'),
    };
    const popups = {
       elimination: document.getElementById('popup-elimination'), // For later
       victory: document.getElementById('popup-victory'), // For later
    }
    const playerCountButtons = screens.playerCount.querySelectorAll('button[data-count]');
    const playerSetupTitle = document.getElementById('player-setup-title');
    const playerNameLabel = document.getElementById('player-name-label');
    const playerNameInput = document.getElementById('input-player-name');
    const classSelectionContainer = document.getElementById('class-selection-buttons');
    const classButtons = classSelectionContainer.querySelectorAll('.btn-class');
    const classDetailsName = document.getElementById('class-name'); // Setup details
    const classDetailsDescription = document.getElementById('class-description'); // Setup details
    const classDetailsAbilities = document.getElementById('class-abilities'); // Setup details
    const classDetailsContainer = document.getElementById('class-details-container');
    const btnBack = document.getElementById('btn-back');
    const btnNext = document.getElementById('btn-next');
    // (Gameplay Elements)
    const gameplayScreen = screens.gameplay;
    const actionBar = document.getElementById('action-bar');
    const gameBoard = document.getElementById('game-board');
    const playerInfoDisplay = document.getElementById('player-info');
    const currentClassDetailsName = document.getElementById('info-class-name'); // Gameplay details
    const currentClassDescription = document.getElementById('info-class-description'); // Gameplay details
    const currentClassAbilitiesList = document.getElementById('info-class-abilities'); // Gameplay details
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
    // (Action Buttons)
    const btnShoot = document.getElementById('action-shoot');
    const btnThrow = document.getElementById('action-throw');
    const btnSilverBullet = document.getElementById('action-silver-bullet');
    // (Hazard Picker)
    const hazardPickerPopup = document.getElementById('hazard-picker');
    const hazardPickerOptions = document.getElementById('hazard-picker-options');
    const btnCancelThrow = document.getElementById('btn-cancel-throw');

    // --- Class Data (Includes Narrative Descriptions & Colors) ---
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

    // --- Layout Data (Example Layouts - Add all 26 per count later!) ---
    const LAYOUT_DATA = {
        '2': [ // 2 Player Layouts
            { // Layout 2P-1 (Example from rules)
                vampires: [ { player: 0, coord: 'A2', facing: 'S', id: 'P1V1' }, { player: 0, coord: 'C4', facing: 'S', id: 'P1V2' }, { player: 1, coord: 'A7', facing: 'N', id: 'P2V1' }, { player: 1, coord: 'C9', facing: 'N', id: 'P2V2' } ],
                bloodwells: [ { player: 0, coord: 'B1', id: 'P1BW1' }, { player: 0, coord: 'D3', id: 'P1BW2' }, { player: 0, coord: 'F2', id: 'P1BW3' }, { player: 1, coord: 'B6', id: 'P2BW1' }, { player: 1, coord: 'D8', id: 'P2BW2' }, { player: 1, coord: 'F7', id: 'P2BW3' } ],
                hazards: [ { type: 'Tombstone', coord: 'E5' }, { type: 'Carcass', coord: 'D5' }, { type: 'Grave Dust', coord: 'F5' }, { type: 'Tombstone', coord: 'G5' }, { type: 'Carcass', coord: 'E4' }, { type: 'Grave Dust', coord: 'E6' } ]
            },
            // Add more 2P layouts here...
        ],
        '3': [ // 3 Player Layouts
             { // Layout 3P-1 (Example from rules)
                 vampires: [ { player: 0, coord: 'A2', facing: 'S', id: 'P1V1' }, { player: 0, coord: 'C4', facing: 'S', id: 'P1V2' }, { player: 1, coord: 'F2', facing: 'S', id: 'P2V1' }, { player: 1, coord: 'H4', facing: 'S', id: 'P2V2' }, { player: 2, coord: 'D8', facing: 'N', id: 'P3V1' }, { player: 2, coord: 'F9', facing: 'N', id: 'P3V2' } ],
                 bloodwells: [ { player: 0, coord: 'B1', id: 'P1BW1' }, { player: 0, coord: 'D3', id: 'P1BW2' }, { player: 0, coord: 'A5', id: 'P1BW3' }, { player: 1, coord: 'G1', id: 'P2BW1' }, { player: 1, coord: 'I3', id: 'P2BW2' }, { player: 1, coord: 'G5', id: 'P2BW3' }, { player: 2, coord: 'C7', id: 'P3BW1' }, { player: 2, coord: 'E6', id: 'P3BW2' }, { player: 2, coord: 'G8', id: 'P3BW3' } ],
                 hazards: [ { type: 'Tombstone', coord: 'E5' }, { type: 'Carcass', coord: 'D5' }, { type: 'Grave Dust', coord: 'F5' }, { type: 'Tombstone', coord: 'G5' }, { type: 'Carcass', coord: 'H5' }, { type: 'Grave Dust', coord: 'B7' } ]
             },
            // Add more 3P layouts here...
        ],
        '4': [ // 4 Player Layouts
             { // Layout 4P-1 (Example from rules)
                 vampires: [ { player: 0, coord: 'A2', facing: 'S', id: 'P1V1' }, { player: 0, coord: 'C4', facing: 'S', id: 'P1V2' }, { player: 1, coord: 'F2', facing: 'S', id: 'P2V1' }, { player: 1, coord: 'H4', facing: 'S', id: 'P2V2' }, { player: 2, coord: 'A7', facing: 'N', id: 'P3V1' }, { player: 2, coord: 'C9', facing: 'N', id: 'P3V2' }, { player: 3, coord: 'F7', facing: 'N', id: 'P4V1' }, { player: 3, coord: 'H9', facing: 'N', id: 'P4V2' } ],
                 bloodwells: [ { player: 0, coord: 'B1', id: 'P1BW1' }, { player: 0, coord: 'D3', id: 'P1BW2' }, { player: 0, coord: 'A3', id: 'P1BW3' }, { player: 1, coord: 'G1', id: 'P2BW1' }, { player: 1, coord: 'I3', id: 'P2BW2' }, { player: 1, coord: 'F3', id: 'P2BW3' }, { player: 2, coord: 'B6', id: 'P3BW1' }, { player: 2, coord: 'D8', id: 'P3BW2' }, { player: 2, coord: 'A8', id: 'P3BW3' }, { player: 3, coord: 'G6', id: 'P4BW1' }, { player: 3, coord: 'I8', id: 'P4BW2' }, { player: 3, coord: 'F8', id: 'P4BW3' } ],
                 hazards: [ { type: 'Tombstone', coord: 'E5' }, { type: 'Carcass', coord: 'D5' }, { type: 'Grave Dust', coord: 'F5' }, { type: 'Tombstone', coord: 'G5' }, { type: 'Carcass', coord: 'E4' }, { type: 'Grave Dust', coord: 'E6' } ]
            },
            // Layout R1 from simulation
             {
                 vampires: [ { player: 0, coord: 'A2', facing: 'S', id: 'S1' }, { player: 0, coord: 'C3', facing: 'S', id: 'S2' }, { player: 1, coord: 'G2', facing: 'S', id: 'V1' }, { player: 1, coord: 'I3', facing: 'S', id: 'V2' }, { player: 2, coord: 'B8', facing: 'N', id: 'O1' }, { player: 2, coord: 'D7', facing: 'N', id: 'O2' }, { player: 3, coord: 'F8', facing: 'N', id: 'B1' }, { player: 3, coord: 'H7', facing: 'N', id: 'B2' } ],
                 bloodwells: [ { player: 0, coord: 'B1', id: 'SBW1' }, { player: 0, coord: 'D2', id: 'SBW2' }, { player: 0, coord: 'A4', id: 'SBW3' }, { player: 1, coord: 'H1', id: 'VBW1' }, { player: 1, coord: 'F2', id: 'VBW2' }, { player: 1, coord: 'I4', id: 'VBW3' }, { player: 2, coord: 'C9', id: 'OBW1' }, { player: 2, coord: 'A7', id: 'OBW2' }, { player: 2, coord: 'D9', id: 'OBW3' }, { player: 3, coord: 'G9', id: 'BBW1' }, { player: 3, coord: 'I7', id: 'BBW2' }, { player: 3, coord: 'F9', id: 'BBW3' } ],
                 hazards: [ { type: 'Tombstone', coord: 'D5' }, { type: 'Tombstone', coord: 'F5' }, { type: 'Carcass', coord: 'E4' }, { type: 'Carcass', coord: 'E6' }, { type: 'Grave Dust', coord: 'D4' }, { type: 'Grave Dust', coord: 'F6' } ]
             }
        ]
    };


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

    // --- Helper Functions ---

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
        const nameElement = document.getElementById('class-name'); // Target setup elements specifically
        const descElement = document.getElementById('class-description');
        const abilitiesElement = document.getElementById('class-abilities');
        const containerElement = document.getElementById('class-details-container');

        if (data) {
            nameElement.innerHTML = `<strong>Class:</strong> ${className}`;
            descElement.textContent = data.description;
            abilitiesElement.innerHTML = ''; // Clear previous abilities
            data.abilities.forEach(ability => {
                const li = document.createElement('li');
                li.innerHTML = `<strong>${ability.name}:</strong> ${ability.description}`;
                abilitiesElement.appendChild(li);
            });
            containerElement.style.display = 'block';
        } else {
            nameElement.innerHTML = `<strong>Class:</strong> ---`;
            descElement.textContent = 'Select a class above to see details.';
            abilitiesElement.innerHTML = '<li>---</li>';
            // Keep container visible maybe? Or hide: containerElement.style.display = 'none';
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
            playerData[playerIndex].class = null; // Reset class selection when revisiting
        }
        playerNameInput.value = playerData[playerIndex].name !== `P${playerNum}` ? playerData[playerIndex].name : '';
        playerNameInput.placeholder = `P${playerNum} Name (Optional)`;
        playerSetupTitle.textContent = `Player ${playerNum} Setup`;
        playerNameLabel.textContent = `Player ${playerNum} Name:`;

        let previouslySelectedButton = classSelectionContainer.querySelector('.selected');
        if (previouslySelectedButton) {
            previouslySelectedButton.classList.remove('selected');
        }
        classButtons.forEach(button => {
            const className = button.dataset.class;
            button.disabled = selectedClasses.includes(className);
            button.style.opacity = button.disabled ? '0.5' : '1';
        });

        displayClassDetails(null); // Reset details view

        btnBack.style.display = (playerIndex === 0) ? 'none' : 'inline-block';
        btnNext.textContent = (playerIndex === numberOfPlayers - 1) ? 'Start Game' : 'Next';
    }

    // Adds a message to the game log panel
    function addToLog(message) {
        const li = document.createElement('li');
        li.textContent = message;
        while (logList.children.length > 50) { // Keep last 50 entries
             logList.removeChild(logList.firstChild);
        }
        logList.appendChild(li);
        gameLog.scrollTop = gameLog.scrollHeight; // Auto-scroll
        console.log("Log:", message);
    }

    // Generates the 9x9 grid structure in the HTML
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

    // Gets the CSS color class for a player index
    function getPlayerColorClass(playerIndex) {
        const player = currentGameState.players[playerIndex];
        return player ? (CLASS_DATA[player.class]?.color || '') : '';
    }

    // --- Board Rendering ---
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

    // --- UI Update ---
    function updatePlayerInfoPanel(player, turn, currentAP, resources) {
        if (!player || !resources) { console.error("Info Panel Error: Invalid player or resource data."); statusBarPlayer.textContent = 'Error'; statusBarAP.textContent = '??'; statusBarTurn.textContent = '??'; currentClassDetailsName.innerHTML = `<strong>Class:</strong> Error`; currentClassDescription.textContent = 'Could not load player data.'; currentClassAbilitiesList.innerHTML = ''; infoSilverBullet.textContent = "Unknown"; return; }
        // console.log(`Updating info panel for ${player.name}, Turn ${turn}, AP: ${currentAP}`); // Reduce noise
        const data = CLASS_DATA[player.class];
        if (data) {
            currentClassDetailsName.innerHTML = `<strong>Class:</strong> ${player.class}`;
            currentClassDescription.textContent = data.description;
            currentClassAbilitiesList.innerHTML = '';
            data.abilities.forEach(ability => {
                const li = document.createElement('li');
                const isUsed = resources.abilitiesUsed.includes(ability.name); // Check if ability name (needs exact match)
                li.innerHTML = `<strong>${ability.name}:</strong> ${ability.description}`;
                if (isUsed) { li.style.opacity = '0.5'; li.style.textDecoration = 'line-through'; }
                currentClassAbilitiesList.appendChild(li);
            });
        }
        infoSilverBullet.textContent = resources.silverBullet > 0 ? `Available (${resources.silverBullet})` : "Used";
        statusBarPlayer.textContent = player.name;
        statusBarAP.textContent = currentAP;
        statusBarTurn.textContent = turn;

        // Update Action Button States
        const canAffordShoot = currentAP >= AP_COST.SHOOT;
        const canAffordThrow = currentAP >= AP_COST.THROW_HAZARD;
        const canAffordSilver = currentAP >= AP_COST.SILVER_BULLET && resources.silverBullet > 0;
        const isVampSelected = !!currentGameState.selectedVampireId;
        const selectedVamp = findVampireById(currentGameState.selectedVampireId);
        const isCursed = selectedVamp?.cursed;

        btnShoot.disabled = !isVampSelected || !canAffordShoot || isCursed;
        btnThrow.disabled = !isVampSelected || !canAffordThrow || isCursed;
        btnSilverBullet.disabled = !isVampSelected || !canAffordSilver || isCursed;
        // TODO: Disable other actions (Move, Pivot?) if needed based on selection/state
    }

    function updateUI() {
        if (!currentGameState || !currentGameState.players || !currentGameState.playerResources) return; // Check if state is valid
        const currentPlayerIndex = currentGameState.currentPlayerIndex;
        // Check if index is valid for the arrays
        if (currentPlayerIndex < 0 || currentPlayerIndex >= currentGameState.players.length || currentPlayerIndex >= currentGameState.playerResources.length) {
            console.error("Error: currentPlayerIndex is out of bounds.", currentGameState);
            return;
        }
        const currentPlayer = currentGameState.players[currentPlayerIndex];
        const currentResources = currentGameState.playerResources[currentPlayerIndex];
        updatePlayerInfoPanel(currentPlayer, currentGameState.turn, currentGameState.currentAP, currentResources);
    }

    // --- Game State & Undo Logic ---
    function saveStateToHistory() {
        try {
            // Create a deep copy of the game state
            const stateCopy = JSON.parse(JSON.stringify(currentGameState));
            gameHistory.push(stateCopy);
            // Limit history size if desired (e.g., keep last 10 states)
            // if (gameHistory.length > 10) gameHistory.shift();
            btnUndo.disabled = false; // Enable undo
            console.log("State saved. History length:", gameHistory.length);
        } catch (error) {
            console.error("Error saving game state:", error);
            alert("Error saving game state! Undo may not work correctly.");
        }
    }

    function undoLastAction() {
        if (gameHistory.length > 0) {
            console.log("Undoing last action...");
            try {
                // Restore the previous state (it's already a deep copy)
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
            }
        } else {
            console.log("No actions in history to undo.");
            btnUndo.disabled = true;
        }
    }

    // --- Find Pieces in Game State ---
    function findVampireById(vampId) {
        return currentGameState.board?.vampires?.find(v => v.id === vampId);
    }
    function findPieceAtCoord(coord) {
        if (!currentGameState?.board) return null;
        const vamp = currentGameState.board.vampires?.find(v => v.coord === coord);
        if (vamp) return { type: 'vampire', piece: vamp };
        const bw = currentGameState.board.bloodwells?.find(b => b.coord === coord);
        if (bw) return { type: 'bloodwell', piece: bw };
        const hazard = currentGameState.board.hazards?.find(h => h.coord === coord);
        if (hazard) return { type: 'hazard', piece: hazard };
        return null;
    }


    // --- Action Execution Functions ---

    function executeMove(vampire, targetCoord) {
        // --- TODO: Full Move Validation ---
        // 1. Check AP Cost
        if (currentGameState.currentAP < AP_COST.MOVE) { addToLog("Not enough AP to Move."); return; }
        // 2. Check if Cursed (Rule: only 1 square move per TURN) - Needs turn-based tracking, complex for simple action
         // For now, let's assume move means 1 square, and we check that it follows facing
         if (vampire.cursed) { addToLog("Cursed movement not fully implemented."); /* Allow basic move for now? */ }
        // 3. Check target validity (must be adjacent IN FACING direction)
        const expectedTarget = getAdjacentCoord(vampire.coord, vampire.facing);
        if (targetCoord !== expectedTarget) {
             addToLog(`Invalid move target. Must move 1 square in facing direction (${vampire.facing}). Expected ${expectedTarget}`);
             return;
        }
        // 4. Check target occupancy (Vamp, BW, Carcass block)
        const pieceAtTarget = findPieceAtCoord(targetCoord);
        if (pieceAtTarget && (pieceAtTarget.type === 'vampire' || pieceAtTarget.type === 'bloodwell' || (pieceAtTarget.type === 'hazard' && pieceAtTarget.piece.type === 'Carcass'))) {
             addToLog(`Cannot move onto square ${targetCoord} occupied by ${pieceAtTarget.piece.type}.`);
             return;
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
        // TODO: Check for Bloodbath (landing on own BW to cure curse)
        const landedOnBW = findPieceAtCoord(targetCoord)?.type === 'bloodwell';
        if (vampire.cursed && landedOnBW && findPieceAtCoord(targetCoord).piece.player === vampire.player && !(findPieceAtCoord(targetCoord)?.type === 'hazard')) {
            vampire.cursed = false;
             addToLog(`${vampire.id} performed Bloodbath at ${targetCoord} and is CURED!`);
        }


        // Update UI
        renderBoard(currentGameState);
        updateUI();
    }

    function executePivot(vampire, newFacing) {
        if (!DIRECTIONS.includes(newFacing)) { console.error("Invalid pivot direction:", newFacing); return; }
        if (currentGameState.currentAP < AP_COST.PIVOT) { addToLog("Not enough AP to Pivot."); return; }
        // Cursed can pivot

        saveStateToHistory();

        vampire.facing = newFacing;
        currentGameState.currentAP -= AP_COST.PIVOT;
        addToLog(`${vampire.id} pivoted to face ${newFacing}. (${currentGameState.currentAP} AP left)`);
        renderBoard(currentGameState);
        updateUI();
    }

    function executeShoot(vampire, isSilverBullet = false) {
        const cost = isSilverBullet ? AP_COST.SILVER_BULLET : AP_COST.SHOOT;
        if (currentGameState.currentAP < cost) { addToLog(`Not enough AP.`); return; }
        if (vampire.cursed) { addToLog("Cursed cannot shoot."); return; }
        const playerResources = currentGameState.playerResources[vampire.player];
         if (isSilverBullet && playerResources.silverBullet <= 0) { addToLog("No Silver Bullet left."); return; }

        saveStateToHistory(); // Save state *before* shooting

        const shooterPlayerIndex = vampire.player;
        const shooterClass = currentGameState.players[shooterPlayerIndex].class;
        let currentCoord = vampire.coord;
        let hitMessage = `Shot from ${vampire.coord} facing ${vampire.facing} travelled off board.`; // Default msg

        addToLog(`${vampire.id} ${isSilverBullet ? 'fires a Silver Bullet' : 'shoots'} facing ${vampire.facing}...`);

        if (isSilverBullet) {
             playerResources.silverBullet--; // Decrement resource
        }
        currentGameState.currentAP -= cost; // Deduct AP

        // Trace path
        for (let i = 0; i < 9; i++) {
            currentCoord = getAdjacentCoord(currentCoord, vampire.facing);
            if (!currentCoord) break; // Off board

            const pieceAtCoord = findPieceAtCoord(currentCoord);
            if (pieceAtCoord) {
                const targetType = pieceAtCoord.type;
                const targetPiece = pieceAtCoord.piece;

                // Check blocking hazards
                if (targetType === 'hazard' && (targetPiece.type === 'Tombstone' || targetPiece.type === 'Dynamite')) {
                     if (targetPiece.type === 'Tombstone' && shooterClass === 'Bounty Hunter') {
                        addToLog(`Passes Tombstone at ${currentCoord} (Sharpshooter).`); continue; // Pass through
                     }
                     // TODO: Check Sheriff 'Under My Protection' if target is Dynamite adjacent to Sheriff? Rules unclear here. Assume Dynamite always blocks.
                     hitMessage = `Shot blocked by ${targetPiece.type} at ${currentCoord}.`;
                     if (targetPiece.type === 'Dynamite') {
                         hitMessage += ` Dynamite EXPLODES!`;
                         // TODO: Trigger Dynamite Explosion Logic
                         // Remove Dynamite hazard
                         const dynamiteIndex = currentGameState.board.hazards.findIndex(h => h.coord === currentCoord);
                         if (dynamiteIndex > -1) currentGameState.board.hazards.splice(dynamiteIndex, 1);
                         // Remove other hazards in 3x3
                         // Destroy BWs in 3x3
                         addToLog("Dynamite logic TBD.");
                     }
                     break; // Stop shot
                }

                // Hit Vampire
                if (targetType === 'vampire') {
                     if (isSilverBullet && targetPiece.player !== shooterPlayerIndex) {
                         hitMessage = `Silver Bullet HIT & ELIMINATED enemy ${targetPiece.id} at ${currentCoord}!`;
                         const targetPlayerIndex = targetPiece.player;
                         currentGameState.board.vampires = currentGameState.board.vampires.filter(v => v.id !== targetPiece.id);
                         // TODO: Check if targetPlayerIndex is now eliminated
                     } else if (shooterClass === 'Bounty Hunter' && targetPiece.player !== shooterPlayerIndex && !targetPiece.cursed) {
                         hitMessage = `Shot HIT enemy ${targetPiece.id} at ${currentCoord}. Target is CURSED (Marked Man)!`;
                         const targetVamp = findVampireById(targetPiece.id); // Ensure we modify the one in state
                         if(targetVamp) targetVamp.cursed = true;
                     } else {
                         hitMessage = `Shot hit ${targetPiece.id} at ${currentCoord} (no effect).`;
                     }
                     break; // Stop shot after hitting vampire
                }

                // Hit Bloodwell
                if (targetType === 'bloodwell') {
                    // TODO: Check Sheriff 'Under My Protection'
                     hitMessage = `Shot DESTROYED Bloodwell ${targetPiece.id} at ${currentCoord}!`;
                     const targetPlayerIndex = targetPiece.player;
                     currentGameState.board.bloodwells = currentGameState.board.bloodwells.filter(bw => bw.id !== targetPiece.id);
                     // TODO: Check if targetPlayerIndex is now eliminated
                     break; // Stop shot
                }

                // Ignore Carcass/Grave Dust for blocking
                if (targetType === 'hazard' && (targetPiece.type === 'Carcass' || targetPiece.type === 'Grave Dust')) {
                     addToLog(`Shot passes through ${targetPiece.type} at ${currentCoord}.`); continue;
                }
            }
        }

        addToLog(hitMessage + ` (${currentGameState.currentAP} AP left)`);
        renderBoard(currentGameState);
        updateUI();
        // TODO: Check win/loss conditions after shot resolution
    }

    function executeThrow(vampire, hazardType, targetCoord) {
        const cost = hazardType === 'Dynamite' ? AP_COST.THROW_DYNAMITE : AP_COST.THROW_HAZARD;
        if (currentGameState.currentAP < cost) { addToLog(`Not enough AP.`); return; }
        if (vampire.cursed) { addToLog("Cursed cannot throw."); return; }
        if (currentGameState.hazardPool[hazardType] <= 0) { addToLog(`No ${hazardType} left.`); return; }

        // --- Validation ---
        // 1. Distance
        const distance = getDistance(vampire.coord, targetCoord);
        if(distance === 0 || distance > 3) { addToLog(`Invalid throw distance (${distance}). Must be 1-3.`); return; }
        // 2. Target Occupancy
        const pieceAtTarget = findPieceAtCoord(targetCoord);
        if(pieceAtTarget && !(hazardType === 'Grave Dust' && pieceAtTarget.type === 'vampire')) {
             addToLog(`Cannot throw onto occupied square ${targetCoord}.`); return;
         }
        // 3. Clear Path (Basic check for now - needs proper line check)
        // TODO: Iterate squares between vampire.coord and targetCoord. Check for Vamp, BW, Carcass.

        // --- If Validation Passes ---
        saveStateToHistory(); // Save state *before* throwing

        currentGameState.hazardPool[hazardType]--;
        currentGameState.board.hazards.push({ type: hazardType, coord: targetCoord });
        currentGameState.currentAP -= cost;
        addToLog(`${vampire.id} threw ${hazardType} to ${targetCoord}. (${currentGameState.currentAP} AP left)`);

        // Curse effect for Grave Dust
        if (hazardType === 'Grave Dust' && pieceAtTarget?.type === 'vampire') {
            const targetVamp = findVampireById(pieceAtTarget.piece.id);
            if (targetVamp && !targetVamp.cursed) {
                targetVamp.cursed = true;
                addToLog(`${targetVamp.id} hit by thrown Grave Dust & CURSED!`);
            }
        }

        renderBoard(currentGameState);
        updateUI();
    }

     function nextTurn() {
         // Don't save state here, end of turn shouldn't be undoable easily? Or save? User wanted undo everywhere... let's save.
         saveStateToHistory();

         const previousPlayerIndex = currentGameState.currentPlayerIndex;
         // TODO: Apply end-of-turn effects (e.g., Sheriff Swift Justice)

         // Advance Player Index (Looping and skipping eliminated)
         let nextPlayerIndex = (previousPlayerIndex + 1) % numberOfPlayers;
         let loopCheck = 0; // Prevent infinite loops if logic fails
         while (currentGameState.players[nextPlayerIndex]?.eliminated && loopCheck < numberOfPlayers) {
             nextPlayerIndex = (nextPlayerIndex + 1) % numberOfPlayers;
             loopCheck++;
         }
         if (loopCheck >= numberOfPlayers && !currentGameState.players[nextPlayerIndex]?.eliminated) {
            console.error("Error: Could not find next active player!");
            addToLog("Error advancing turn!");
            // Potentially revert state?
             undoLastAction(); // Revert the end turn attempt
            return;
         }
         currentGameState.currentPlayerIndex = nextPlayerIndex;


         // Increment turn number if we wrapped around
         if (currentGameState.currentPlayerIndex <= previousPlayerIndex) { // Use <= to handle 2P correctly
            currentGameState.turn++;
         }

        // Set AP for the new player
         const playerIndex = currentGameState.currentPlayerIndex;
         // Reset AP based on rules
         if (currentGameState.turn === 1 && numberOfPlayers === 4) currentGameState.currentAP = [4, 5, 6, 8][playerIndex];
         else if (currentGameState.turn === 1 && numberOfPlayers === 3) currentGameState.currentAP = 6;
         else if (currentGameState.turn === 1 && numberOfPlayers === 2) currentGameState.currentAP = 5;
         else currentGameState.currentAP = 5; // Standard AP for all turns after 1

         // TODO: Add Vigilante Blood Brothers check here

         // Reset turn state
         currentGameState.selectedVampireId = null;
         currentGameState.actionState = { pendingAction: null, selectedHazardType: null };
         // Manage Undo History - Clear on new turn to simplify? Or allow multi-turn undo?
         // For now, let's keep history BUT disable undo button at turn start. Player must undo BEFORE ending turn.
         btnUndo.disabled = true;
         // gameHistory = []; // Option to clear history each turn

         // Update UI
         renderBoard(currentGameState);
         updateUI();
         const currentPlayer = currentGameState.players[currentGameState.currentPlayerIndex];
         addToLog(`--- Turn ${currentGameState.turn} - ${currentPlayer.name}'s turn (${currentPlayer.class}). AP: ${currentGameState.currentAP} ---`);
         // TODO: Check Victory condition here (only 1 player not eliminated)
    }

    // --- Event Listener Handlers ---
    function handleBoardClick(event) { const clickedSquareElement = event.target.closest('.grid-square'); if (!clickedSquareElement) return; const clickedCoord = clickedSquareElement.dataset.coord; const pendingAction = currentGameState.actionState.pendingAction; if (pendingAction === 'throw-select-target') { const selectedHazardType = currentGameState.actionState.selectedHazardType; const selectedVamp = findVampireById(currentGameState.selectedVampireId); /* TODO: Validate click target coord fully */ executeThrow(selectedVamp, selectedHazardType, clickedCoord); currentGameState.actionState = { pendingAction: null, selectedHazardType: null }; clearHighlights(); } else if (pendingAction === 'move-select-target') { const selectedVamp = findVampireById(currentGameState.selectedVampireId); if(selectedVamp) executeMove(selectedVamp, clickedCoord); currentGameState.actionState = { pendingAction: null }; clearHighlights(); } else { handleVampireSelection(event); } }
    function handleVampireSelection(event) { const clickedVampireElement = event.target.closest('.vampire'); if (clickedVampireElement) { const vampireId = clickedVampireElement.dataset.id; const ownerIndex = parseInt(clickedVampireElement.dataset.player); if (ownerIndex === currentGameState.currentPlayerIndex) { if (currentGameState.selectedVampireId !== vampireId) { console.log(`Selected vampire ${vampireId}`); currentGameState.selectedVampireId = vampireId; renderBoard(currentGameState); updateUI(); } } else { addToLog("Cannot select opponent's vampire."); if (currentGameState.selectedVampireId) { currentGameState.selectedVampireId = null; renderBoard(currentGameState); updateUI(); } } } else if (event.target.classList.contains('grid-square')) { if (currentGameState.selectedVampireId && !currentGameState.actionState.pendingAction) { /* Don't deselect if pending target selection */ console.log("Deselecting vampire."); currentGameState.selectedVampireId = null; renderBoard(currentGameState); updateUI(); clearHighlights(); } } }
    function clearHighlights() { document.querySelectorAll('.grid-square.valid-target, .grid-square.invalid-target').forEach(el => el.classList.remove('valid-target', 'invalid-target')); }

    // --- Initialization ---
    function initializeGame() { console.log("Initializing game..."); gameHistory = []; const layoutsForPlayerCount = LAYOUT_DATA[numberOfPlayers]; if (!layoutsForPlayerCount || layoutsForPlayerCount.length === 0) { alert(`Error: No layouts for ${numberOfPlayers} players!`); console.error(`No layouts found for ${numberOfPlayers} players!`); showScreen('playerCount'); return; } const layoutIndex = Math.floor(Math.random() * layoutsForPlayerCount.length); const selectedLayout = layoutsForPlayerCount[layoutIndex]; addToLog(`Selected Layout: ${numberOfPlayers}P Layout #${layoutIndex + 1}`); currentGameState = { players: playerData.map(p => ({ name: p.name, class: p.class, eliminated: false })), board: { vampires: JSON.parse(JSON.stringify(selectedLayout.vampires.map(v => ({...v, cursed: false})))), bloodwells: JSON.parse(JSON.stringify(selectedLayout.bloodwells)), hazards: JSON.parse(JSON.stringify(selectedLayout.hazards)) }, hazardPool: { 'Tombstone': 4 - selectedLayout.hazards.filter(h => h.type === 'Tombstone').length, 'Carcass': 4 - selectedLayout.hazards.filter(h => h.type === 'Carcass').length, 'Grave Dust': 4 - selectedLayout.hazards.filter(h => h.type === 'Grave Dust').length, 'Dynamite': 3 }, playerResources: playerData.map(() => ({ silverBullet: 1, abilitiesUsed: [] })), turn: 1, currentPlayerIndex: 0, currentAP: 0, selectedVampireId: null, actionState: { pendingAction: null, selectedHazardType: null } }; const playerIndex = currentGameState.currentPlayerIndex; if (currentGameState.turn === 1) { if (numberOfPlayers === 4) currentGameState.currentAP = [4, 5, 6, 8][playerIndex]; else if (numberOfPlayers === 3) currentGameState.currentAP = 6; else if (numberOfPlayers === 2) currentGameState.currentAP = 5; } else { currentGameState.currentAP = 5; } generateGrid(); renderBoard(currentGameState); const currentPlayer = currentGameState.players[currentGameState.currentPlayerIndex]; if (!currentPlayer) { console.error("Error: Init failed, no current player."); return; } const currentResources = currentGameState.playerResources[currentGameState.currentPlayerIndex]; updatePlayerInfoPanel(currentPlayer, currentGameState.turn, currentGameState.currentAP, currentResources); logList.innerHTML = `<li>Game Started with Layout ${numberOfPlayers}P Layout #${layoutIndex + 1}</li>`; gameLog.scrollTop = 0; btnUndo.disabled = true; gameBoard.removeEventListener('click', handleBoardClick); gameBoard.addEventListener('click', handleBoardClick); btnUndo.removeEventListener('click', undoLastAction); btnUndo.addEventListener('click', undoLastAction); btnEndTurn.removeEventListener('click', nextTurn); btnEndTurn.addEventListener('click', nextTurn); showScreen('gameplay'); addToLog(`Turn ${currentGameState.turn} - ${currentPlayer.name}'s turn (${currentPlayer.class}). AP: ${currentGameState.currentAP}`); }

    // --- Attach Event Listeners ---
    // Setup Screens Listeners
    playerCountButtons.forEach(button => { button.addEventListener('click', () => { numberOfPlayers = parseInt(button.dataset.count); playerData = new Array(numberOfPlayers); selectedClasses = []; updatePlayerSetupScreen(0); showScreen('playerSetup'); }); });
    classButtons.forEach(button => { button.addEventListener('click', () => { if (button.disabled) return; let sel = classSelectionContainer.querySelector('.selected'); if (sel) sel.classList.remove('selected'); button.classList.add('selected'); const cls = button.dataset.class; if (playerData[currentPlayerSetupIndex]) playerData[currentPlayerSetupIndex].class = cls; displayClassDetails(cls); }); });
    playerNameInput.addEventListener('input', () => { if(playerData[currentPlayerSetupIndex]) playerData[currentPlayerSetupIndex].name = playerNameInput.value.trim() || `P${currentPlayerSetupIndex + 1}`; });
    btnBack.addEventListener('click', () => { const cls = playerData[currentPlayerSetupIndex]?.class; if(cls) { const idx = selectedClasses.indexOf(cls); if (idx > -1) selectedClasses.splice(idx, 1); } if (currentPlayerSetupIndex > 0) updatePlayerSetupScreen(currentPlayerSetupIndex - 1); else { selectedClasses = []; playerData = []; showScreen('playerCount'); } });
    btnNext.addEventListener('click', () => { const data = playerData[currentPlayerSetupIndex]; if (!data || !data.class) { alert(`Please select a class for Player ${currentPlayerSetupIndex + 1}!`); return; } if (!data.name) data.name = `P${currentPlayerSetupIndex + 1}`; if (!selectedClasses.includes(data.class)) selectedClasses.push(data.class); if (currentPlayerSetupIndex < numberOfPlayers - 1) updatePlayerSetupScreen(currentPlayerSetupIndex + 1); else initializeGame(); });
    // Gameplay Screen Listeners
    btnToggleLog.addEventListener('click', () => { gameLog.classList.toggle('log-hidden'); });
    btnBackToSetup.addEventListener('click', () => { if (confirm("Return to setup? Game progress will be lost.")) { numberOfPlayers = 0; currentPlayerSetupIndex = 0; playerData = []; selectedClasses = []; currentGameState = {}; gameHistory = []; showScreen('playerCount'); } });
    // Action Buttons
    btnShoot.addEventListener('click', () => { const vamp = findVampireById(currentGameState.selectedVampireId); if (vamp) executeShoot(vamp, false); else addToLog("Select Vampire."); });
    btnSilverBullet.addEventListener('click', () => { const vamp = findVampireById(currentGameState.selectedVampireId); const res = currentGameState.playerResources[currentGameState.currentPlayerIndex]; if (vamp && res.silverBullet > 0) { if (confirm("Use Silver Bullet?")) executeShoot(vamp, true); } else if (!vamp) addToLog("Select Vampire."); else addToLog("No Silver Bullet."); });
    btnThrow.addEventListener('click', () => { const vamp = findVampireById(currentGameState.selectedVampireId); if (!vamp) { addToLog("Select Vampire."); return; } if (vamp.cursed) { addToLog("Cursed cannot throw."); return; } if (currentGameState.currentAP < AP_COST.THROW_HAZARD) { addToLog("Not enough AP."); return; } populateHazardPicker(); hazardPickerPopup.style.display = 'flex'; currentGameState.actionState.pendingAction = 'throw-select-hazard'; addToLog("Select hazard to throw."); });
    btnCancelThrow.addEventListener('click', () => { hazardPickerPopup.style.display = 'none'; currentGameState.actionState = { pendingAction: null, selectedHazardType: null }; clearHighlights(); addToLog("Throw cancelled."); });
    hazardPickerOptions.addEventListener('click', (event) => { const btn = event.target.closest('button'); if (btn?.dataset.hazardType) handleHazardSelection(btn.dataset.hazardType); });
    // Function for handling hazard selection from picker
    function handleHazardSelection(hazardType) { console.log("Selected hazard:", hazardType); const cost = hazardType === 'Dynamite' ? AP_COST.THROW_DYNAMITE : AP_COST.THROW_HAZARD; if (currentGameState.hazardPool[hazardType] <= 0) { addToLog(`No ${hazardType} left.`); return; } if (currentGameState.currentAP < cost) { addToLog(`Not enough AP for ${hazardType}.`); return; } currentGameState.actionState.pendingAction = 'throw-select-target'; currentGameState.actionState.selectedHazardType = hazardType; hazardPickerPopup.style.display = 'none'; highlightThrowTargets(); addToLog(`Throwing ${hazardType}. Select target square.`); }
    // Function to highlight valid throw targets
    function highlightThrowTargets() { clearHighlights(); const selectedVamp = findVampireById(currentGameState.selectedVampireId); if (!selectedVamp) return; const startCoord = selectedVamp.coord; const hazardType = currentGameState.actionState.selectedHazardType; document.querySelectorAll('.grid-square').forEach(square => { const targetCoord = square.dataset.coord; const distance = getDistance(startCoord, targetCoord); let isValid = false; if (distance > 0 && distance <= 3) { /* TODO: Add path & target occupancy validation */ const pieceAtTarget = findPieceAtCoord(targetCoord); if (!pieceAtTarget || (hazardType === 'Grave Dust' && pieceAtTarget.type === 'vampire')) isValid = true; } if (isValid) square.classList.add('valid-target'); else square.classList.add('invalid-target'); }); }

    // --- Initial Load ---
    showScreen('playerCount'); // Start with the player count screen

}); // End DOMContentLoaded
