document.addEventListener('DOMContentLoaded', () => {

    // --- 1. Top-Level State Variables ---
    let numberOfPlayers = 0;
    let currentPlayerSetupIndex = 0;
    let playerData = []; // Array to hold { name: 'P1', class: null } objects
    let selectedClasses = []; // Keep track of classes chosen so far in setup
    let currentGameState = {}; // Main object holding all game info
    let gameHistory = []; // Stores previous game states for Undo
    let lastActiveScreenId = 'playerCount'; // Track where help was opened from

    // --- 2. Constants ---
    const AP_COST = {
        MOVE: 1, PIVOT: 1, SHOOT: 3, SILVER_BULLET: 3,
        THROW_HAZARD: 1, // Base cost for Tombstone, Black Widow, Grave Dust
        THROW_DYNAMITE: 2,
        // Add other action costs (Dispel, Bite Fuse, Abilities) here later
    };
    const DIRECTIONS = ['N', 'E', 'S', 'W'];
    
    const CLASS_DATA = { // Narrative descriptions updated to ~150 chars for Setup Screen
        "Sheriff": {
            color: "color-sheriff",
            description: "A faction of Vampires enforcing order in a chaotic frontier.",
            abilities: [
                { name: "Under My Protection", type: "Passive", apCost: 0, description: "The Sheriff's vigilance shields nearby Bloodwells, making them difficult targets for careless foes seeking an easy shot.", techDesc: "Bloodwells in 3x3 grid centered on Sheriff are immune to standard Shots (not Hand Cannon)." },
                { name: "Swift Justice", type: "Passive", apCost: 0, description: "Fueled by unwavering purpose, one Sheriff presses forward relentlessly, taking a swift extra step after the turn's actions conclude.", techDesc: "End of Turn: May move one non-cursed Sheriff 1 square forward (0 AP)." },
                { name: "Order Restored", type: "Active", apCost: 3, description: "Even true death cannot halt the Sheriff's decree! By dark ritual, call back a comrade destroyed in battle to rejoin the fight for order.", techDesc: "1/game: Revive one eliminated Sheriff adjacent to own Vamp/BW." }
            ]
        },
        "Vigilante": {
            color: "color-vigilante",
            description: "A faction of Vampires seeking justice, using teamwork.",
            abilities: [
                { name: "Side by Side", type: "Passive", apCost: 0, description: "Bound by blood and vengeance, this driven pair acts as one, drawing from a shared pool of unnatural energy for their actions.", techDesc: "Player's AP pool is shared between both Vampires." },
                { name: "Blood Brothers", type: "Passive", apCost: 0, description: "Their shared purpose empowers their dark bond when near. Fighting side-by-side fills this ruthless kin with a surge of preternatural energy.", techDesc: "Start of Turn: +1 AP if Vamps are within 3x3 grid and both act this turn." },
                { name: "Vengeance is Mine", type: "Active", apCost: 0, description: "Harm my kin, feel my wrath tenfold! Wounds suffered only fuel their dark rage, promising overwhelming fury on their next turn.", techDesc: "1/game: After own piece is shot, gain 7 AP next turn." }
            ]
        },
        "Outlaw": {
            color: "color-outlaw",
            description: "A faction of Vampires thriving on chaos, disrupting and escaping.",
            abilities: [
                { name: "Daring Escape", type: "Passive", apCost: 0, description: "Blast an enemy Bloodwell, then melt into the shadows, using the chaos for a swift, spectral getaway and repositioning.", techDesc: "1/turn: After shooting a Bloodwell, may Pivot free & Move up to 2 squares (0 AP)." },
                { name: "Hand Cannon", type: "Active", apCost: 5, description: "Unleash unholy hellfire from a modified Hand Cannon! This cursed shot tears through obstacles and stone alike in its destructive path.", techDesc: "1/game: Piercing shot (max 5 sq), ignores Hazards (unless Sheriff-prot.). Destroys BW/Hazards hit." },
                { name: "Rampage", type: "Active", apCost: 2, description: "Embrace the chaos! The Outlaw spins wildly, unleashing a hail of lead left and right simultaneously to catch foes in a deadly crossfire.", techDesc: "1/game: Shoot simultaneously Left & Right (two standard shots)." }
            ]
        },
        "Bounty Hunter": {
            color: "color-bounty-hunter",
            description: "A faction of Vampires hunting for profit, using precision.",
            abilities: [
                { name: "Sharpshooter", type: "Passive", apCost: 0, description: "Tombstones offer no refuge. This Hunter's unnervingly accurate shots find paths through solid stone, leaving no target truly safe.", techDesc: "Shots ignore Tombstones when determining hit/block." },
                { name: "Marked Man", type: "Passive", apCost: 0, description: "Every bullet carries a debilitating hex. Vampires struck find their unnatural vitality failing, crippling their movement and attacks.", techDesc: "Standard shots hitting enemy Vamps apply Curse (Move 1/turn, No Shoot/Throw)." },
                { name: "Contract Payoff", type: "Active", apCost: 3, description: "Destroying an enemy Bloodwell brings dark satisfaction and fuels the Hunter with bonus energy for the next strike.", techDesc: "1/game: If shot destroys any BW, gain +3 AP (2P) / +5 AP (3P/4P) next turn." }
            ]
        }
    };
    // ... (LAYOUT_DATA etc. follow) ...
    const LAYOUT_DATA = {
        '2': [
             { // Layout 2P-1 (Adjusted for 8 Hazards: 3T, 3BW, 2G)
                vampires: [ { player: 0, coord: 'A2', facing: 'S', id: 'P1V1' }, { player: 0, coord: 'C4', facing: 'S', id: 'P1V2' }, { player: 1, coord: 'H7', facing: 'N', id: 'P2V1' }, { player: 1, coord: 'G9', facing: 'N', id: 'P2V2' } ], // Adjusted P2 start slightly
                bloodwells: [ { player: 0, coord: 'B1', id: 'P1BW1' }, { player: 0, coord: 'D3', id: 'P1BW2' }, { player: 0, coord: 'A4', id: 'P1BW3' }, { player: 1, coord: 'I8', id: 'P2BW1' }, { player: 1, coord: 'G6', id: 'P2BW2' }, { player: 1, coord: 'H9', id: 'P2BW3' } ], // Adjusted P2 BWs
                hazards: [
                    { type: 'Tombstone', coord: 'D5' }, { type: 'Tombstone', coord: 'F5' }, { type: 'Tombstone', coord: 'E4' }, // 3T
                    { type: 'Black Widow', coord: 'E6' }, { type: 'Black Widow', coord: 'C5' }, { type: 'Black Widow', coord: 'G5' }, // 3BW
                    { type: 'Grave Dust', coord: 'D6' }, { type: 'Grave Dust', coord: 'F4' } // 2GD
                ] // Total 8
            },
            // Add more 2P layouts here...
        ],
        '3': [
             { // Layout 3P-1 (Adjusted for 8 Hazards: 3T, 2BW, 3G)
                 vampires: [ { player: 0, coord: 'A2', facing: 'S', id: 'P1V1' }, { player: 0, coord: 'C4', facing: 'S', id: 'P1V2' }, { player: 1, coord: 'G1', facing: 'S', id: 'P2V1' }, { player: 1, coord: 'I3', facing: 'S', id: 'P2V2' }, { player: 2, coord: 'D8', facing: 'N', id: 'P3V1' }, { player: 2, coord: 'F9', facing: 'N', id: 'P3V2' } ], // Adjusted P2 start slightly
                 bloodwells: [ { player: 0, coord: 'B1', id: 'P1BW1' }, { player: 0, coord: 'D3', id: 'P1BW2' }, { player: 0, coord: 'A4', id: 'P1BW3' }, { player: 1, coord: 'H2', id: 'P2BW1' }, { player: 1, coord: 'F3', id: 'P2BW2' }, { player: 1, coord: 'I5', id: 'P2BW3' }, { player: 2, coord: 'C7', id: 'P3BW1' }, { player: 2, coord: 'E6', id: 'P3BW2' }, { player: 2, coord: 'G8', id: 'P3BW3' } ], // Adjusted P1/P2 BWs
                 hazards: [
                    { type: 'Tombstone', coord: 'E5' }, { type: 'Tombstone', coord: 'C5' }, { type: 'Tombstone', coord: 'G5' }, // 3T
                    { type: 'Black Widow', coord: 'D4' }, { type: 'Black Widow', coord: 'F4' }, // 2BW
                    { type: 'Grave Dust', coord: 'E6' }, { type: 'Grave Dust', coord: 'B7' }, { type: 'Grave Dust', coord: 'H7' } // 3GD
                 ] // Total 8
             },
            // Add more 3P layouts here...
        ],
        '4': [
             { // Layout 4P-1 (Adjusted for 8 Hazards: 2T, 3BW, 3G)
                 vampires: [ { player: 0, coord: 'A2', facing: 'S', id: 'P1V1' }, { player: 0, coord: 'C4', facing: 'S', id: 'P1V2' }, { player: 1, coord: 'G1', facing: 'S', id: 'P2V1' }, { player: 1, coord: 'I3', facing: 'S', id: 'P2V2' }, { player: 2, coord: 'A8', facing: 'N', id: 'P3V1' }, { player: 2, coord: 'C9', facing: 'N', id: 'P3V2' }, { player: 3, coord: 'G8', facing: 'N', id: 'P4V1' }, { player: 3, coord: 'I9', facing: 'N', id: 'P4V2' } ], // Adjusted starts slightly
                 bloodwells: [ { player: 0, coord: 'B1', id: 'P1BW1' }, { player: 0, coord: 'D3', id: 'P1BW2' }, { player: 0, coord: 'A4', id: 'P1BW3' }, { player: 1, coord: 'H2', id: 'P2BW1' }, { player: 1, coord: 'F3', id: 'P2BW2' }, { player: 1, coord: 'I5', id: 'P2BW3' }, { player: 2, coord: 'B6', id: 'P3BW1' }, { player: 2, coord: 'D8', id: 'P3BW2' }, { player: 2, coord: 'A9', id: 'P3BW3' }, { player: 3, coord: 'H6', id: 'P4BW1' }, { player: 3, coord: 'F8', id: 'P4BW2' }, { player: 3, coord: 'I7', id: 'P4BW3' } ], // Adjusted BWs slightly
                 hazards: [
                    { type: 'Tombstone', coord: 'D5' }, { type: 'Tombstone', coord: 'F5' }, // 2T
                    { type: 'Black Widow', coord: 'E4' }, { type: 'Black Widow', coord: 'E6' }, { type: 'Black Widow', coord: 'C7' },// 3BW
                    { type: 'Grave Dust', coord: 'C4' }, { type: 'Grave Dust', coord: 'G4' }, { type: 'Grave Dust', coord: 'G7' } // 3GD
                 ] // Total 8
            },
            { // Layout R1 (Adjusted for 8 Hazards: 3T, 3BW, 2G)
                 vampires: [ { player: 0, coord: 'A2', facing: 'S', id: 'S1' }, { player: 0, coord: 'C3', facing: 'S', id: 'S2' }, { player: 1, coord: 'G2', facing: 'S', id: 'V1' }, { player: 1, coord: 'I3', facing: 'S', id: 'V2' }, { player: 2, coord: 'B8', facing: 'N', id: 'O1' }, { player: 2, coord: 'D7', facing: 'N', id: 'O2' }, { player: 3, coord: 'F8', facing: 'N', id: 'B1' }, { player: 3, coord: 'H7', facing: 'N', id: 'B2' } ],
                 bloodwells: [ { player: 0, coord: 'B1', id: 'SBW1' }, { player: 0, coord: 'D2', id: 'SBW2' }, { player: 0, coord: 'A4', id: 'SBW3' }, { player: 1, coord: 'H1', id: 'VBW1' }, { player: 1, coord: 'F2', id: 'VBW2' }, { player: 1, coord: 'I4', id: 'VBW3' }, { player: 2, coord: 'C9', id: 'OBW1' }, { player: 2, coord: 'A7', id: 'OBW2' }, { player: 2, coord: 'D9', id: 'OBW3' }, { player: 3, coord: 'G9', id: 'BBW1' }, { player: 3, coord: 'I7', id: 'BBW2' }, { player: 3, coord: 'F9', id: 'BBW3' } ],
                 hazards: [ // Was 2T, 2C, 2G. Now 3T, 3BW, 2G = 8
                    { type: 'Tombstone', coord: 'D5' }, { type: 'Tombstone', coord: 'F5' }, { type: 'Tombstone', coord: 'E7' }, // 3T
                    { type: 'Black Widow', coord: 'E4' }, { type: 'Black Widow', coord: 'E6' }, { type: 'Black Widow', coord: 'C5' }, // 3BW
                    { type: 'Grave Dust', coord: 'D4' }, { type: 'Grave Dust', coord: 'G5' } // 2GD
                 ] // Total 8
             }
             // Add more 4P layouts here...
        ]
    }; // IMPORTANT: Replace abbreviated data if necessary

    // --- 3. DOM Element References --- // Note: Original numbering kept for internal reference, this is Section 2 of pasting sequence
    // Screens & Popups
    const btnHelp = document.getElementById('btn-help');
    const screenHowToPlay = document.getElementById('screen-how-to-play');
    const btnBackToGame = document.getElementById('btn-back-to-game');
    const screens = {
        playerCount: document.getElementById('screen-player-count'),
        playerSetup: document.getElementById('screen-player-setup'),
        gameplay: document.getElementById('screen-gameplay'),
    };
    const popups = {
       elimination: document.getElementById('popup-elimination'),
       victory: document.getElementById('popup-victory'),
       hazardPicker: document.getElementById('hazard-picker'), // Reference the hazard picker popup
       howToPlay: document.getElementById('screen-how-to-play')
    };

    const movementBar = document.getElementById('movement-bar');
    // Add references for the specific arrow buttons too
    const btnMoveN = document.getElementById('move-n');
    const btnMoveW = document.getElementById('move-w');
    const btnMoveE = document.getElementById('move-e');
    const btnMoveS = document.getElementById('move-s');

    // Player Count Screen Elements
    const playerCountButtons = screens.playerCount.querySelectorAll('button[data-count]');

    // Player Setup Screen Elements
    const playerSetupTitle = document.getElementById('player-setup-title');
    const playerNameLabel = document.getElementById('player-name-label');
    const playerNameInput = document.getElementById('input-player-name');
    const classSelectionContainer = document.getElementById('class-selection-buttons');
    const classButtons = classSelectionContainer.querySelectorAll('.btn-class');
    const btnBackToStart = document.getElementById('btn-back-to-start');
    const classDetailsName = document.getElementById('class-name'); // Setup details
    const classDetailsDescription = document.getElementById('class-description'); // Setup details
    const classDetailsAbilities = document.getElementById('class-abilities'); // Setup details
    const classDetailsContainer = document.getElementById('class-details-container');
    const btnBack = document.getElementById('btn-back');
    const btnNext = document.getElementById('btn-next');

    // Gameplay Screen Elements
    const gameplayScreen = screens.gameplay; // Alias for convenience
    const actionBar = document.getElementById('action-bar');
    const gameBoard = document.getElementById('game-board');
    const playerInfoDisplay = document.getElementById('player-info');
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
    const btnBackToSetup = document.getElementById('btn-back-to-setup'); // Dev button

    // Action Buttons (Gameplay)
    const btnShoot = document.getElementById('action-shoot');
    const btnThrow = document.getElementById('action-throw');
    const btnSilverBullet = document.getElementById('action-silver-bullet');
    // Add refs for other action buttons (Move, Pivot, Dispel etc.) if/when they are added to HTML, e.g.:
    // const btnMoveFwd = document.getElementById('action-move-fwd'); // Currently not in HTML

    // Hazard Picker Elements (Inside the popup)
    const hazardPickerOptions = document.getElementById('hazard-picker-options');
    const btnCancelThrow = document.getElementById('btn-cancel-throw');

    // Inside the "DOMContentLoaded" listener, after DOM References section...

    // --- Checking Gameplay Info Panel DOM References ---
    console.log("--- Checking Gameplay Info Panel DOM References ---");
    // Line for currentClassDetailsName removed
    console.log('  currentClassAbilitiesList:', !!currentClassAbilitiesList);
    console.log('  infoSilverBullet:', !!infoSilverBullet);
    console.log('  statusBarPlayer:', !!statusBarPlayer);
    console.log('  statusBarAP:', !!statusBarAP);
    console.log("--- End Check ---");
    // --- END DEBUG BLOCK ---

    // --- 4. Function Definitions --- // Note: Original numbering kept, this is Section 3 of pasting

    // --- Coordinate Helper Functions ---
    function getRowColFromCoord(coord) { if (!coord || coord.length < 2) return null; const colLetter = coord.charAt(0).toUpperCase(); const rowNum = parseInt(coord.substring(1)); if (isNaN(rowNum) || colLetter < 'A' || colLetter > 'I' || rowNum < 1 || rowNum > 9) return null; return { row: rowNum, col: colLetter.charCodeAt(0) - 64 }; }
    function getCoordFromRowCol(row, col) { if (row < 1 || row > 9 || col < 1 || col > 9) return null; const colLetter = String.fromCharCode(64 + col); return `${colLetter}${row}`; }
    function getAdjacentCoord(coord, direction) { const rc = getRowColFromCoord(coord); if (!rc) return null; let { row, col } = rc; if (direction === 'N') row--; else if (direction === 'S') row++; else if (direction === 'E') col++; else if (direction === 'W') col--; return getCoordFromRowCol(row, col); }
    function getAllAdjacentCoords(coord) { const adjacentCoords = []; const rc = getRowColFromCoord(coord); if (!rc) return adjacentCoords; for (let dr = -1; dr <= 1; dr++) { for (let dc = -1; dc <= 1; dc++) { if (dr === 0 && dc === 0) continue; const adjRow = rc.row + dr; const adjCol = rc.col + dc; const adjCoord = getCoordFromRowCol(adjRow, adjCol); if (adjCoord) adjacentCoords.push(adjCoord); } } return adjacentCoords; }
    function getNewFacing(currentFacing, pivotType) { const currentIndex = DIRECTIONS.indexOf(currentFacing); if (currentIndex === -1) return currentFacing; let newIndex; if (pivotType === 'L') newIndex = (currentIndex - 1 + DIRECTIONS.length) % DIRECTIONS.length; else if (pivotType === 'R') newIndex = (currentIndex + 1) % DIRECTIONS.length; else if (pivotType === '180') newIndex = (currentIndex + 2) % DIRECTIONS.length; else return currentFacing; return DIRECTIONS[newIndex]; }
    function getDistance(coord1, coord2) { const rc1 = getRowColFromCoord(coord1); const rc2 = getRowColFromCoord(coord2); if (!rc1 || !rc2) return Infinity; return Math.abs(rc1.row - rc2.row) + Math.abs(rc1.col - rc2.col); }

    /**
    //* Gets all valid coordinates within a square radius around a center coordinate.
    * @param {string} centerCoord - The center coordinate (e.g., 'E5').
    * @param {number} radius - The distance from the center (1 for 3x3, 2 for 5x5, etc.).
    * @returns {string[]} An array of valid coordinates within the area.
    */
   function getCoordsInArea(centerCoord, radius) {
       const coords = [];
       const centerRC = getRowColFromCoord(centerCoord);
       if (!centerRC) return coords; // Invalid center
   
       for (let dr = -radius; dr <= radius; dr++) {
           for (let dc = -radius; dc <= radius; dc++) {
               // Optional: Skip the center square itself if needed by rules
               // if (dr === 0 && dc === 0) continue;
   
               const targetRow = centerRC.row + dr;
               const targetCol = centerRC.col + dc;
               const targetCoord = getCoordFromRowCol(targetRow, targetCol);
               if (targetCoord) { // Only add valid board coordinates
                   coords.push(targetCoord);
               }
           }
       }
       return coords;
   }

    // --- UI Helper Functions ---
    // Switches the visible screen & tracks last screen before Help
    // Switches the visible screen OR displays a popup overlay
    function showScreen(screenId) {
        const targetScreenElement = screens[screenId]; // Is it a main screen?
        const targetPopupElement = popups[screenId];   // Is it a popup?

        if (targetScreenElement) {
            // --- Showing a Main Screen ---
            // Record the current active screen BEFORE switching (unless it's a popup)
            const currentActiveScreen = document.querySelector('.screen.active:not(.popup)'); // Find active screen that isn't a popup
            if (currentActiveScreen && currentActiveScreen.id !== screenId) {
                lastActiveScreenId = currentActiveScreen.id;
                console.log(`Stored last screen: ${lastActiveScreenId}`);
            }

            // Hide other main screens and show the target
            Object.values(screens).forEach(screen => screen?.classList.remove('active')); // Use optional chaining
            targetScreenElement.classList.add('active');
            console.log(`Showing screen: ${screenId}`);

            // Ensure popups are hidden when switching main screens
            Object.values(popups).forEach(popup => { if(popup) popup.style.display = 'none'; });

        } else if (targetPopupElement) {
            // --- Showing a Popup ---
            // Record which main screen is active underneath
            const currentActiveScreen = document.querySelector('.screen.active:not(.popup)');
            if (currentActiveScreen) {
                lastActiveScreenId = currentActiveScreen.id;
                console.log(`Stored last screen before popup: ${lastActiveScreenId}`);
            } else {
                // Fallback if no main screen is active somehow? Should not happen in normal flow.
                lastActiveScreenId = 'gameplay'; // Default to gameplay?
                console.warn(`No active main screen found when showing popup ${screenId}. Storing fallback: ${lastActiveScreenId}`);
            }

            // Show the target popup using direct style (matching hazard picker)
            targetPopupElement.style.display = 'flex';
            console.log(`Showing popup: ${screenId}`);

        } else {
            // ID not found in screens or popups
            console.error(`Screen/Popup with id "${screenId}" not found.`);
            // Potentially show an error message or default screen
        }
    }
    function displayClassDetails(className) { const data = CLASS_DATA[className]; const nameEl = document.getElementById('class-name'); const descEl = document.getElementById('class-description'); const abilitiesEl = document.getElementById('class-abilities'); const containerEl = document.getElementById('class-details-container'); if (data) { nameEl.innerHTML = `<strong>Class:</strong> ${className}`; descEl.textContent = data.description; abilitiesEl.innerHTML = ''; data.abilities.forEach(ability => { const li = document.createElement('li'); li.innerHTML = `<strong>${ability.name}:</strong> ${ability.description}`; abilitiesEl.appendChild(li); }); containerEl.style.display = 'block'; } else { nameEl.innerHTML = `<strong>Class:</strong> ---`; descEl.textContent = 'Select a class...'; abilitiesEl.innerHTML = '<li>---</li>'; } }
    // Updates the player setup screen UI for the correct player
    function updatePlayerSetupScreen(playerIndex) {
        const playerNum = playerIndex + 1;
        currentPlayerSetupIndex = playerIndex;

        console.log(`Setting up screen for Player ${playerNum}`);

        // Initialize player data slot if it doesn't exist or reset class
        if (!playerData[playerIndex]) {
            playerData[playerIndex] = { name: `P${playerNum}`, class: null };
        } else {
            playerData[playerIndex].class = null; // Reset class selection when revisiting
        }

        playerNameInput.value = playerData[playerIndex].name !== `P${playerNum}` ? playerData[playerIndex].name : '';
        playerNameInput.placeholder = `P${playerNum} Name (Optional)`;
        playerSetupTitle.textContent = `Player ${playerNum} Setup`;
        playerNameLabel.textContent = `Player ${playerNum} Name:`; // Ensure label updates if needed

        // Reset and update class buttons status
        let previouslySelectedButton = classSelectionContainer.querySelector('.selected');
        if (previouslySelectedButton) {
            previouslySelectedButton.classList.remove('selected');
        }
        classButtons.forEach(button => {
            const className = button.dataset.class;
            button.disabled = selectedClasses.includes(className); // Disable already chosen classes
            button.style.opacity = button.disabled ? '0.5' : '1';
        });

        // Reset class details display
        displayClassDetails(null);

        // Update navigation buttons visibility and text
        const isFirstPlayer = (playerIndex === 0);
        if (btnBack) btnBack.style.display = isFirstPlayer ? 'none' : 'inline-block'; // Hide Back for P1
        if (btnBackToStart) btnBackToStart.style.display = isFirstPlayer ? 'none' : 'inline-block'; // Also hide Back to Start for P1
        if (btnNext) {
            btnNext.textContent = (playerIndex === numberOfPlayers - 1) ? 'Start Game' : 'Next';
            btnNext.disabled = true; // Start disabled until class selected
        }
    }
    function addToLog(message) { const li = document.createElement('li'); li.textContent = message; while (logList.children.length > 50) logList.removeChild(logList.firstChild); logList.appendChild(li); if (gameLog && !gameLog.classList.contains('log-hidden')) gameLog.scrollTop = gameLog.scrollHeight; console.log("Log:", message); }
    function generateGrid() { gameBoard.innerHTML = ''; for (let r = 1; r <= 9; r++) { for (let c = 1; c <= 9; c++) { const square = document.createElement('div'); const colLetter = String.fromCharCode(64 + c); const coord = `${colLetter}${r}`; square.classList.add('grid-square'); square.dataset.coord = coord; gameBoard.appendChild(square); } } console.log("Generated grid."); }
    function getPlayerColorClass(playerIndex) { const player = currentGameState.players?.[playerIndex]; return player ? (CLASS_DATA[player.class]?.color || '') : ''; }
    function clearHighlights() { document.querySelectorAll('.grid-square.valid-target, .grid-square.invalid-target').forEach(el => el.classList.remove('valid-target', 'invalid-target')); }

    // --- Board Rendering & Gameplay UI Update ---

    // Renders pieces on the board based on game state (Updated for Bloodwell Styling)
    // --- Board Rendering & Gameplay UI Update ---

    // Renders pieces on the board based on game state (Corrected Variable Scopes)
    function renderBoard(gameState) {
        // console.log("Rendering board state..."); // Reduce console noise
        document.querySelectorAll('.piece').forEach(p => p.remove()); // Clear existing pieces

        if (!gameState || !gameState.board) { console.error("Render Error: Invalid game state provided."); return; }

        // Render Vampires
        gameState.board.vampires?.forEach(vamp => {
            const targetSquare = gameBoard.querySelector(`[data-coord="${vamp.coord}"]`);
            if (targetSquare) {
                // CORRECT: Define and use vampElement *only* within this loop's scope
                const vampElement = document.createElement('div');
                const playerClass = gameState.players[vamp.player]?.class;
                const classColor = CLASS_DATA[playerClass]?.color || '';
                vampElement.classList.add('piece', 'vampire', classColor);
                vampElement.dataset.id = vamp.id; vampElement.dataset.player = vamp.player; vampElement.dataset.facing = vamp.facing;
                if (vamp.id === gameState.selectedVampireId) vampElement.classList.add('selected');
                if (vamp.cursed) vampElement.classList.add('cursed');
                vampElement.textContent = `P${vamp.player + 1}`;
                targetSquare.appendChild(vampElement); // Use vampElement here
            } else {
                 console.warn(`Square not found for vampire ${vamp.id} at ${vamp.coord}`);
            }
        }); // End of Vampire loop scope for vampElement

        // Render Bloodwells
        gameState.board.bloodwells?.forEach(bw => {
            const targetSquare = gameBoard.querySelector(`[data-coord="${bw.coord}"]`);
            if (targetSquare) {
                // CORRECT: Define and use bwElement within this loop's scope
                const bwElement = document.createElement('div');
                const playerClass = gameState.players[bw.player]?.class;
                const classColor = CLASS_DATA[playerClass]?.color || '';
                // Add base class AND the specific class color name for border styling
                bwElement.classList.add('piece', 'bloodwell', classColor);
                // DO NOT ADD player index class (we switched back to classColor for border)
                bwElement.dataset.id = bw.id;
                bwElement.dataset.player = bw.player;
                bwElement.textContent = '🩸'; // Blood drop icon
                targetSquare.appendChild(bwElement); // Use bwElement here
            } else {
                 console.warn(`Square not found for bloodwell ${bw.id} at ${bw.coord}`);
            }
        }); // End of Bloodwell loop scope for bwElement

        // Render Hazards
        gameState.board.hazards?.forEach(hazard => {
            const targetSquare = gameBoard.querySelector(`[data-coord="${hazard.coord}"]`);
            if (targetSquare) {
                 // CORRECT: Define and use hazardElement within this loop's scope
                const hazardElement = document.createElement('div');
                hazardElement.classList.add('piece', 'hazard');
                const typeClass = `hazard-${hazard.type.toLowerCase().replace(' ','-')}`;
                hazardElement.classList.add(typeClass);
                let icon = '?';
                if (hazard.type === 'Tombstone') icon = '🪦';
                else if (hazard.type === 'Black Widow') icon = '🕷️'; // Corrected type
                else if (hazard.type === 'Grave Dust') icon = '💩';
                else if (hazard.type === 'Dynamite') icon = '💥';
                hazardElement.textContent = icon;
                targetSquare.appendChild(hazardElement); // Use hazardElement here
            } else {
                 console.warn(`Square not found for hazard at ${hazard.coord}`);
            }
        }); // End of Hazard loop scope for hazardElement
    }
    
    // Updates the player info panel during gameplay (REWRITTEN for new layout/content)
    function updatePlayerInfoPanel(player, turn, currentAP, resources) {
        // --- ADD THIS DEBUG BLOCK ---
        console.log('--- updatePlayerInfoPanel START ---');
        console.log('Received player:', JSON.stringify(player)); // Log received player data
        console.log('Received resources:', JSON.stringify(resources)); // Log received resources data
        console.log('Received turn:', turn);
        console.log('Received currentAP:', currentAP);
        // Log the DOM refs *again* right before the check uses them
        console.log('Check DOM Ref status:');
        console.log('  currentClassAbilitiesList:', !!currentClassAbilitiesList);
        console.log('  infoSilverBullet:', !!infoSilverBullet);
        console.log('  statusBarPlayer:', !!statusBarPlayer);
        console.log('  statusBarAP:', !!statusBarAP);
        console.log('--- End Debug Checks ---');
        // --- END DEBUG BLOCK ---
        // Ensure elements exist and data is valid
        if (!player || !resources || !currentClassAbilitiesList || !infoSilverBullet || !statusBarPlayer || !statusBarAP) {
            console.error("Info Panel Error: One or more required elements not found or invalid data provided.");
            statusBarPlayer.textContent = 'Error'; statusBarAP.textContent = '??';
            // Clear details on error
            const classDetailsH3 = document.querySelector('#current-class-details h3');
            if(classDetailsH3) classDetailsH3.textContent = "Error Loading Info";
            currentClassAbilitiesList.innerHTML = '';
            infoSilverBullet.textContent = "Unknown";
            return;
        }

        // --- Update Status Bar (No Turn #) ---
        statusBarPlayer.textContent = player.name;
        statusBarAP.textContent = currentAP;
        // statusBarTurn.textContent = turn; // Turn # Removed

        // --- Update Class Details Panel ---
        const classData = CLASS_DATA[player.class];
        const panelH3 = document.querySelector('#current-class-details h3'); // Get the h3 title element

        if (panelH3) {
             panelH3.textContent = `${player.class || 'Unknown'} Abilities`; // Set dynamic title
        }
        currentClassAbilitiesList.innerHTML = ''; // Clear previous abilities list

        if (classData && classData.abilities) {
            // Filter abilities
            const availableActiveAbilities = classData.abilities.filter(a =>
                a.type === 'Active' && !resources.abilitiesUsed?.includes(a.name) // Filter out used ones
            );
            const passiveAbilities = classData.abilities.filter(a => a.type === 'Passive');

            // Render Active Abilities (if any available)
            if (availableActiveAbilities.length > 0) {
                const activeHeader = document.createElement('h4');
                activeHeader.textContent = "Active Abilities";
                currentClassAbilitiesList.appendChild(activeHeader);

                availableActiveAbilities.forEach(ability => {
                    const li = document.createElement('li');
                    const costText = ability.apCost > 0 ? ` (${ability.apCost} AP)` : ""; // Show cost only if > 0
                    li.innerHTML = `<strong>${ability.name}${costText}:</strong> ${ability.techDesc || ability.description}`; // Use techDesc
                    // TODO: Add click listeners for usable active abilities
                    currentClassAbilitiesList.appendChild(li);
                });
            }

            // Render Divider (if both types exist and available actives exist)
            if (availableActiveAbilities.length > 0 && passiveAbilities.length > 0) {
                currentClassAbilitiesList.appendChild(document.createElement('hr'));
            }

            // Render Passive Abilities (if any exist)
            if (passiveAbilities.length > 0) {
                const passiveHeader = document.createElement('h4');
                passiveHeader.textContent = "Passive Abilities";
                currentClassAbilitiesList.appendChild(passiveHeader);

                passiveAbilities.forEach(ability => {
                    const li = document.createElement('li');
                    li.innerHTML = `<strong>${ability.name}:</strong> ${ability.techDesc || ability.description}`; // Use techDesc
                    currentClassAbilitiesList.appendChild(li);
                });
            }

        } else {
            // Handle case where class data might be missing
            const li = document.createElement('li');
            li.textContent = "Ability data not found.";
            currentClassAbilitiesList.appendChild(li);
        }

        // Update Silver Bullet status
        infoSilverBullet.textContent = resources.silverBullet > 0 ? `Available (${resources.silverBullet})` : "Used";

        // --- Update Action & Movement Button States ---
        const canAffordMoveOrPivot = currentAP >= AP_COST.MOVE;
        const canAffordShoot = currentAP >= AP_COST.SHOOT;
        const canAffordThrowBase = currentAP >= AP_COST.THROW_HAZARD;
        const canAffordSilver = currentAP >= AP_COST.SILVER_BULLET && resources.silverBullet > 0;
        const isVampSelected = !!currentGameState.selectedVampireId;
        const selectedVamp = findVampireById(currentGameState.selectedVampireId);
        const isCursed = selectedVamp?.cursed;
        const movesTakenThisTurn = selectedVamp?.movesThisTurn || 0;
        const canMoveForward = !isCursed || movesTakenThisTurn < 1;

        if (btnShoot) btnShoot.disabled = !isVampSelected || !canAffordShoot || isCursed;
        if (btnThrow) btnThrow.disabled = !isVampSelected || !canAffordThrowBase || isCursed;
        if (btnSilverBullet) btnSilverBullet.disabled = !isVampSelected || !canAffordSilver || isCursed;

        if(btnMoveN) btnMoveN.disabled = !isVampSelected || !canAffordMoveOrPivot || (selectedVamp?.facing === 'N' && !canMoveForward);
        if(btnMoveE) btnMoveE.disabled = !isVampSelected || !canAffordMoveOrPivot || (selectedVamp?.facing === 'E' && !canMoveForward);
        if(btnMoveS) btnMoveS.disabled = !isVampSelected || !canAffordMoveOrPivot || (selectedVamp?.facing === 'S' && !canMoveForward);
        if(btnMoveW) btnMoveW.disabled = !isVampSelected || !canAffordMoveOrPivot || (selectedVamp?.facing === 'W' && !canMoveForward);

        // TODO: Disable/enable Class Active Ability buttons/elements based on AP cost and used status
    }

    function updateUI() { if (!currentGameState?.players?.length || !currentGameState.playerResources?.length) return; const idx = currentGameState.currentPlayerIndex; if (idx < 0 || idx >= currentGameState.players.length || idx >= currentGameState.playerResources.length) { console.error("Error: Invalid idx.", currentGameState); return; } const player = currentGameState.players[idx]; const resources = currentGameState.playerResources[idx]; if (player && resources) updatePlayerInfoPanel(player, currentGameState.turn, currentGameState.currentAP, resources); else console.error("Error fetching player/resources."); }

    // --- Game State & Undo Logic ---
    function saveStateToHistory() { try { gameHistory.push(JSON.parse(JSON.stringify(currentGameState))); btnUndo.disabled = false; console.log("State saved. History:", gameHistory.length); } catch (error) { console.error("Error saving state:", error); alert("Undo Error!"); } }
    function undoLastAction() { if (gameHistory.length > 0) { console.log("Undoing..."); try { currentGameState = gameHistory.pop(); renderBoard(currentGameState); updateUI(); addToLog("--- Action Undone ---"); btnUndo.disabled = gameHistory.length === 0; } catch (error) { console.error("Error restoring state:", error); alert("Undo Restore Error!"); btnUndo.disabled = true; } } else { console.log("Nothing to undo."); btnUndo.disabled = true; } }

    // --- Find Pieces ---
    function findVampireById(vampId) { return currentGameState.board?.vampires?.find(v => v.id === vampId); }
    function findPieceAtCoord(coord) { if (!currentGameState?.board) return null; const vamp = currentGameState.board.vampires?.find(v => v.coord === coord); if (vamp) return { type: 'vampire', piece: vamp }; const bw = currentGameState.board.bloodwells?.find(b => b.coord === coord); if (bw) return { type: 'bloodwell', piece: bw }; const hazard = currentGameState.board.hazards?.find(h => h.coord === coord); if (hazard) return { type: 'hazard', piece: hazard }; return null; }

    // --- Action Execution Functions ---
    function executeMove(vampire, targetCoord) { if (!vampire) return false; const cost = AP_COST.MOVE; if (currentGameState.currentAP < cost) { addToLog("No AP."); return false; } if (vampire.cursed && (vampire.movesThisTurn || 0) >= 1) { addToLog(`Cursed ${vampire.id} already moved.`); return false; } const expectedTarget = getAdjacentCoord(vampire.coord, vampire.facing); if (targetCoord !== expectedTarget) { addToLog(`Invalid move target.`); return false; } const pieceAtTarget = findPieceAtCoord(targetCoord); if (pieceAtTarget && (pieceAtTarget.type === 'vampire' || pieceAtTarget.type === 'bloodwell' || pieceAtTarget.piece.type === 'Black Widow')) { addToLog(`Blocked by ${pieceAtTarget.piece?.type || pieceAtTarget.type}.`); return false; } saveStateToHistory(); const oldCoord = vampire.coord; vampire.coord = targetCoord; currentGameState.currentAP -= cost; vampire.movesThisTurn = (vampire.movesThisTurn || 0) + 1; addToLog(`${vampire.id} moved ${oldCoord} -> ${targetCoord}. (${currentGameState.currentAP} AP)`); const hazardLandedOn = currentGameState.board.hazards.find(h => h.coord === targetCoord); if (hazardLandedOn?.type === 'Grave Dust' && !vampire.cursed) { console.log("Curse by GD land."); vampire.cursed = true; addToLog(`${vampire.id} CURSED by Grave Dust!`); } if (vampire.cursed) { const landedOnHazard = !!hazardLandedOn; if (!landedOnHazard) { const adjacentCoords = getAllAdjacentCoords(targetCoord); let foundAdjacentBW = false; let adjacentBWCoord = null; for (const adjCoord of adjacentCoords) { const pieceAtAdj = findPieceAtCoord(adjCoord); if (pieceAtAdj?.type === 'bloodwell' && pieceAtAdj.piece.player === vampire.player) { foundAdjacentBW = true; adjacentBWCoord = adjCoord; break; } } if (foundAdjacentBW) { console.log("Bloodbath cure!"); vampire.cursed = false; vampire.movesThisTurn = 0; addToLog(`${vampire.id} CURED by Bloodbath near ${adjacentBWCoord}!`); } } } console.log(`Move End: ${vampire.id}, Cursed: ${vampire.cursed}, Moves: ${vampire.movesThisTurn}`); renderBoard(currentGameState); updateUI(); return true; }
    function executePivot(vampire, newFacing) { if (!vampire || !DIRECTIONS.includes(newFacing)) return false; if (currentGameState.currentAP < AP_COST.PIVOT) { addToLog("No AP."); return false; } saveStateToHistory(); vampire.facing = newFacing; currentGameState.currentAP -= AP_COST.PIVOT; addToLog(`${vampire.id} pivoted ${newFacing}. (${currentGameState.currentAP} AP)`); renderBoard(currentGameState); updateUI(); return true; }
    function executeShoot(vampire, isSilverBullet = false) {
        if (!vampire) { console.error("ExecuteShoot: No vampire."); return false; }
        const cost = isSilverBullet ? AP_COST.SILVER_BULLET : AP_COST.SHOOT;
        // Basic validation checks
        if (currentGameState.currentAP < cost) { addToLog(`Not enough AP.`); return false; }
        if (vampire.cursed) { addToLog("Cursed cannot shoot."); return false; }
        const playerResources = currentGameState.playerResources[vampire.player];
        if (isSilverBullet && playerResources.silverBullet <= 0) { addToLog("No Silver Bullet."); return false; }

        saveStateToHistory(); // Save state *before* shooting

        const shooterPlayerIndex = vampire.player;
        const shooterClass = currentGameState.players[shooterPlayerIndex].class;
        let currentCoord = vampire.coord;
        let hitMessage = `Shot from ${vampire.coord} facing ${vampire.facing} travelled off board.`;
        let shotResolved = false;

        addToLog(`${vampire.id} ${isSilverBullet ? 'fires a Silver Bullet' : 'shoots'} facing ${vampire.facing}...`);

        if (isSilverBullet) {
            playerResources.silverBullet--;
        }
        currentGameState.currentAP -= cost;

        // Trace path square by square
        for (let i = 0; i < 9 && !shotResolved; i++) {
            const nextCoord = getAdjacentCoord(currentCoord, vampire.facing);
            if (!nextCoord) { hitMessage = `Shot from ${vampire.coord} went off the board.`; shotResolved = true; break; }
            currentCoord = nextCoord;

            const pieceAtCoord = findPieceAtCoord(currentCoord);
            if (pieceAtCoord) {
                const targetType = pieceAtCoord.type;
                const targetPiece = pieceAtCoord.piece;

                // --- Check Hazard Interactions ---
                if (targetType === 'hazard') {
                    // Rule: Tombstone blocks LoS/Path (stops shot), unless BH. Destroys Tombstone. Special SB case.
                    if (targetPiece.type === 'Tombstone') {
                        if (shooterClass === 'Bounty Hunter') {
                            addToLog(`Passes through Tombstone at ${currentCoord} (Sharpshooter).`);
                            continue; // Bounty Hunter ignores, shot continues
                        } else {
                            // Non-BH hit Tombstone
                            const vampBehind = currentGameState.board.vampires.find(v => v.coord === currentCoord && v.player !== shooterPlayerIndex);
                            if (isSilverBullet && vampBehind) {
                                // Special Case: SB hits Tombstone shielding enemy Vamp
                                hitMessage = `Silver Bullet shattered Tombstone at ${currentCoord}, but ${vampBehind.id} was protected! (SB Wasted)`;
                            } else {
                                // Standard Hit: Destroy Tombstone
                                hitMessage = `Shot DESTROYED Tombstone at ${currentCoord}!`;
                            }
                            // Remove Tombstone in both non-BH cases where it's hit
                            currentGameState.board.hazards = currentGameState.board.hazards.filter(h => h.coord !== currentCoord);
                            shotResolved = true; break; // Shot stops here
                        }
                    }
                    // Rule: Dynamite blocks LoS/Path, Explodes when hit, potentially causing chain reactions.
                    else if (targetPiece.type === 'Dynamite') {
                        const initialExplosionCoord = currentCoord; // Where the shot hit
                        hitMessage = `Shot hit Dynamite at ${initialExplosionCoord}. It EXPLODES, starting potential chain reaction!`;
                        shotResolved = true; // Mark shot as resolved

                        console.log(`Dynamite hit by shot at ${initialExplosionCoord}. Initiating explosion processing.`);
                        addToLog(`Shot triggers Dynamite at ${initialExplosionCoord}!`);

                        // --- Initiate Chain Reaction Processing ---
                        const explosionQueue = [initialExplosionCoord]; // Start queue with the first dynamite hit
                        const processedExplosions = new Set(); // Keep track of coords already exploded in this chain
                        
                        // Call the function to handle the explosion queue
                        processExplosionQueue(explosionQueue, processedExplosions); 
                        // --- End Chain Reaction Initiation ---

                        // The shot stops after hitting the first dynamite. The queue handles the rest.
                        break; 
                    }
                    // Rule: Black Widow is destroyed when hit, stops shot.
                    else if (targetPiece.type === 'Black Widow') {
                        hitMessage = `Shot destroyed Black Widow at ${currentCoord}!`;
                        currentGameState.board.hazards = currentGameState.board.hazards.filter(h => h.coord !== currentCoord);
                        shotResolved = true; break; // Stop shot path
                    }
                    // Rule: Grave Dust allows pass-through.
                    else if (targetPiece.type === 'Grave Dust') {
                         addToLog(`Shot passes through Grave Dust at ${currentCoord}.`);
                         continue; // Shot continues
                    }
                }
                // --- Check Piece Interactions (if not blocked/passed through hazard) ---
                else if (targetType === 'vampire') {
                    if (isSilverBullet && targetPiece.player !== shooterPlayerIndex) {
                        hitMessage = `Silver Bullet HIT & ELIMINATED enemy ${targetPiece.id} at ${currentCoord}!`;
                        currentGameState.board.vampires = currentGameState.board.vampires.filter(v => v.id !== targetPiece.id);
                        if (checkPlayerElimination(eliminatedVampPlayerIndex)) {
                            handlePlayerElimination(eliminatedVampPlayerIndex);
                       }
                       checkGameEnd(); // Check if game ended after potential elimination
                       // --- End Check ---
                    } else if (shooterClass === 'Bounty Hunter' && targetPiece.player !== shooterPlayerIndex && !targetPiece.cursed) {
                        hitMessage = `Shot HIT enemy ${targetPiece.id} at ${currentCoord}. Target is CURSED (Marked Man)!`;
                        const targetVamp = findVampireById(targetPiece.id);
                        if(targetVamp) targetVamp.cursed = true;
                    } else {
                        hitMessage = `Shot hit ${targetPiece.id} at ${currentCoord} (no effect).`;
                    }
                    shotResolved = true; break; // Stop shot
                }
                else if (targetType === 'bloodwell') {
                    // TODO: Check Sheriff 'Under My Protection'
                    hitMessage = `Shot DESTROYED Bloodwell ${targetPiece.id} at ${currentCoord}!`;
                    currentGameState.board.bloodwells = currentGameState.board.bloodwells.filter(bw => bw.id !== targetPiece.id);
                    checkGameEnd(); // Check if game ended after potential elimination
                    // --- End Check ---
                    shotResolved = true; break; // Stop shot
                }
            }
            // If square was empty, shot continues
        }

        // Final log message and UI update
        addToLog(hitMessage + ` (${currentGameState.currentAP} AP left)`);
        if (isSilverBullet && !shotResolved && hitMessage.includes("off board")) { // Clarify SB miss log
           addToLog("Silver Bullet did not hit anything before leaving board.");
        }

        renderBoard(currentGameState);
        updateUI();
        // TODO: Check win/loss conditions
        return true; // Indicate action attempt success (even if shot missed/blocked)
    }
    function executeThrow(vampire, hazardType, targetCoord) { if (!vampire) return false; const cost = hazardType === 'Dynamite' ? AP_COST.THROW_DYNAMITE : AP_COST.THROW_HAZARD; if (currentGameState.currentAP < cost) { addToLog(`No AP.`); return false; } if (vampire.cursed) { addToLog("Cursed cannot throw."); return false; } if (!currentGameState.hazardPool || (currentGameState.hazardPool[hazardType] || 0) <= 0) { addToLog(`No ${hazardType}.`); return false; } const dist = getDistance(vampire.coord, targetCoord); if (dist === 0 || dist > 3) { addToLog(`Bad distance.`); return false; } const targetPiece = findPieceAtCoord(targetCoord); if (targetPiece && !(hazardType === 'Grave Dust' && targetPiece.type === 'vampire')) { addToLog(`Target blocked.`); return false; } /* TODO: Path validation */ saveStateToHistory(); currentGameState.hazardPool[hazardType]--; currentGameState.board.hazards.push({ type: hazardType, coord: targetCoord }); currentGameState.currentAP -= cost; addToLog(`${vampire.id} threw ${hazardType} to ${targetCoord}. (${currentGameState.currentAP} AP)`); if (hazardType === 'Grave Dust' && targetPiece?.type === 'vampire') { const targetV = findVampireById(targetPiece.piece.id); if (targetV && !targetV.cursed) { targetV.cursed = true; addToLog(`${targetV.id} CURSED by GD!`); } } renderBoard(currentGameState); updateUI(); return true; }
    function nextTurn() {
        // Check if any actions are pending (like selecting throw target)
        if (currentGameState.actionState?.pendingAction) {
            addToLog("Cannot end turn while an action is pending. Cancel or complete the action.");
            return;
        }

        // Save state before ending turn (allows undoing the 'end turn' itself)
        saveStateToHistory();

        const previousPlayerIndex = currentGameState.currentPlayerIndex;
        const previousPlayer = currentGameState.players[previousPlayerIndex];

        // --- Apply end-of-turn effects ---
        // TODO: Implement Sheriff Swift Justice UI/Logic
        if (previousPlayer?.class === 'Sheriff' && !previousPlayer.eliminated) {
            addToLog("Sheriff's Swift Justice may apply (Manual Check / UI TBD).");
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
        if (currentGameState.currentPlayerIndex === 0 && previousPlayerIndex !== 0 && numberOfPlayers > 1) { // Added check for >1 player
             currentGameState.turn++;
        } else if (numberOfPlayers === 1 && currentGameState.currentPlayerIndex === previousPlayerIndex) {
             // Handle single player scenario if needed, maybe don't increment turn?
             // Or the game should end? For now, do nothing special.
        } else if (currentGameState.currentPlayerIndex < previousPlayerIndex) {
             // Wrapped around in >2 player game
             currentGameState.turn++;
        }


       // Set AP for the new player
        const playerIndex = currentGameState.currentPlayerIndex;
        // Reset AP based on rules
        if (currentGameState.turn === 1) { // Only check turn 1 for scaling
             if (numberOfPlayers === 4) currentGameState.currentAP = [4, 5, 6, 8][playerIndex];
             else if (numberOfPlayers === 3) currentGameState.currentAP = 6;
             else if (numberOfPlayers === 2) currentGameState.currentAP = 5;
             else currentGameState.currentAP = 5; // Fallback
        } else {
             currentGameState.currentAP = 5; // Standard AP for all turns after 1
        }
        // TODO: Add Vigilante Blood Brothers check here & potentially add +1 AP

        // --- Reset turn-specific state ---
        currentGameState.selectedVampireId = null;
        currentGameState.actionState = { pendingAction: null, selectedHazardType: null };
        clearHighlights();
        if(movementBar) movementBar.classList.add('hidden'); // <-- HIDE MOVEMENT BAR HERE
        btnUndo.disabled = true;
        // Reset movesThisTurn for ALL vampires at the start of a new turn
        if (currentGameState.board?.vampires) {
            currentGameState.board.vampires.forEach(v => v.movesThisTurn = 0);
        }
        // gameHistory = []; // Clearing history means cannot undo across turns - KEEPING history for now

        // Update UI for new player
        renderBoard(currentGameState); // Rerender to remove selection highlights etc.
        updateUI(); // Update panels and button states
        const currentPlayer = currentGameState.players[currentGameState.currentPlayerIndex];
        addToLog(`--- Turn ${currentGameState.turn} - ${currentPlayer.name}'s turn (${currentPlayer.class}). AP: ${currentGameState.currentAP} ---`);
        // TODO: Check Victory condition here (only 1 player not eliminated)
   }

    // --- Event Listener Handlers ---
    function handleBoardClick(event) { const squareEl = event.target.closest('.grid-square'); if (!squareEl) return; const coord = squareEl.dataset.coord; if (!currentGameState?.actionState) return; const pending = currentGameState.actionState.pendingAction; if (pending === 'throw-select-target') { const type = currentGameState.actionState.selectedHazardType; const vamp = findVampireById(currentGameState.selectedVampireId); if (squareEl.classList.contains('valid-target')) executeThrow(vamp, type, coord); else addToLog("Invalid target. Throw cancelled."); currentGameState.actionState = { pendingAction: null, selectedHazardType: null }; clearHighlights(); } else if (pending === 'move-select-target') { const vamp = findVampireById(currentGameState.selectedVampireId); if (vamp && squareEl.classList.contains('valid-target')) executeMove(vamp, coord); else addToLog("Invalid target. Move cancelled."); currentGameState.actionState = { pendingAction: null }; clearHighlights(); } else { handleVampireSelection(event); } }
    // Handles selecting/deselecting a vampire
    function handleVampireSelection(event) {
    // This function is called when no other action is pending
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
                if(movementBar) movementBar.classList.remove('hidden'); // <-- SHOW Movement Bar
                renderBoard(currentGameState); // Update selection highlight
                updateUI(); // Update button states
            }
            // Optional: If clicking the already selected vampire, deselect?
            // else { currentGameState.selectedVampireId = null; if(movementBar) movementBar.classList.add('hidden'); renderBoard... updateUI... }

        } else {
            // Clicked opponent's vampire
            addToLog("Cannot select opponent's vampire.");
            // Deselect currently selected friendly vampire if any
             if (currentGameState.selectedVampireId) {
                 currentGameState.selectedVampireId = null;
                 if(movementBar) movementBar.classList.add('hidden'); // <-- HIDE Movement Bar
                 renderBoard(currentGameState);
                 updateUI();
             }
        }
    } else if (event.target.closest('.grid-square')) { // Use closest to handle clicks inside square
        // Clicked on an empty square (or hazard/BW) - deselect current vampire
        if (currentGameState.selectedVampireId) {
            console.log("Deselecting vampire by clicking elsewhere.");
            currentGameState.selectedVampireId = null;
            if(movementBar) movementBar.classList.add('hidden'); // <-- HIDE Movement Bar
            renderBoard(currentGameState); // Re-render to remove highlight
            updateUI();
            clearHighlights(); // Clear any potential lingering highlights
        }
    }
}

// Listener for the OK button on the elimination popup
const btnCloseElimination = document.getElementById('btn-close-elimination');
if (btnCloseElimination) {
    btnCloseElimination.addEventListener('click', () => {
        popups.elimination.style.display = 'none'; // Hide popup
        // After closing elimination, check again if the game ended (in case that elimination ended the game)
        checkGameEnd();
    });
} else {
    console.warn("Elimination popup close button not found");
}

// Listener for the Restart button on the victory popup
const btnRestartVictory = document.getElementById('btn-restart-victory');
if (btnRestartVictory) {
    btnRestartVictory.addEventListener('click', () => {
        popups.victory.style.display = 'none'; // Hide popup
        // Use the existing "Back to Setup" logic/button or create a full restart function
        addToLog("Restarting game...");
        // Option 1: Simulate click on the dev button
        // btnBackToSetup.click();
        // Option 2: Call initializeGame directly (if setup data is still valid) - Less clean reset
        // initializeGame();
        // Option 3: Reload the page (simplest full reset)
        window.location.reload();
    });
} else {
    console.warn("Victory popup restart button not found");
}

    // --- Functions for Throw Action ---
    function populateHazardPicker() {
        hazardPickerOptions.innerHTML = '';
        if (!currentGameState?.hazardPool || typeof currentGameState.currentAP === 'undefined') {
            console.error("Cannot populate picker: Invalid state.");
            addToLog("Error prepping throw.");
            return;
        }
        
        const pool = currentGameState.hazardPool;
        const ap = currentGameState.currentAP;
        
        const createBtn = (type, icon, cost) => {
            const btn = document.createElement('button');
            btn.dataset.hazardType = type;
            const count = pool[type] || 0;
            btn.innerHTML = `<span class="hazard-icon">${icon}</span> ${type} <span class="hazard-cost">(${cost} AP)</span>`;
            btn.disabled = count <= 0 || ap < cost;
            btn.title = `${count} available`;
            hazardPickerOptions.appendChild(btn);
        };
        
        createBtn('Tombstone', '🪦', AP_COST.THROW_HAZARD);
        createBtn('Black Widow', '🕷️', AP_COST.THROW_HAZARD);
        createBtn('Grave Dust', '💩', AP_COST.THROW_HAZARD);
        createBtn('Dynamite', '💥', AP_COST.THROW_DYNAMITE);
    }
    
    function handleHazardSelection(hazardType) {
        console.log("Selected hazard:", hazardType);
        const cost = hazardType === 'Dynamite' ? AP_COST.THROW_DYNAMITE : AP_COST.THROW_HAZARD;
        
        if (!currentGameState?.hazardPool || !currentGameState.actionState) {
            return;
        }
        
        if ((currentGameState.hazardPool[hazardType] || 0) <= 0) {
            addToLog(`No ${hazardType}.`);
            return;
        }
        
        if (currentGameState.currentAP < cost) {
            addToLog(`Not enough AP.`);
            return;
        }
        
        currentGameState.actionState.pendingAction = 'throw-select-target';
        currentGameState.actionState.selectedHazardType = hazardType;
        popups.hazardPicker.style.display = 'none'; /* Use reference from popups object */
        highlightThrowTargets();
        addToLog(`Throwing ${hazardType}. Select target.`);
    }
    // Calculates and highlights valid squares for the selected throw action
    // Calculates and highlights valid squares for the selected throw action (Updated Path Rules)
    function highlightThrowTargets() {
        clearHighlights(); // Clear previous highlights first
        const selectedVamp = findVampireById(currentGameState?.selectedVampireId);

        // Ensure required state is available
        if (!selectedVamp || !currentGameState?.actionState?.selectedHazardType) {
             console.error("Cannot highlight throw targets: Missing selected vampire or hazard type.");
             return;
        }

        const startCoord = selectedVamp.coord;
        const facing = selectedVamp.facing;
        const hazardType = currentGameState.actionState.selectedHazardType;
        if (!startCoord || !facing || !hazardType) return; // Ensure we have needed info

        let currentPathCoord = startCoord; // Tracks the square check is moving from
        let pathClear = true; // Assume path is clear initially

        // Check squares 1, 2, and 3 steps away IN FACING DIRECTION
        for (let dist = 1; dist <= 3; dist++) {
            const targetCoord = getAdjacentCoord(currentPathCoord, facing);

            if (!targetCoord) { // Fell off the board
                pathClear = false; // Path is blocked by edge
                break; // Stop checking further
            }

            // If the path was already blocked by a piece on a previous iteration, stop.
            if (!pathClear) {
                 console.log(`Path already blocked before reaching distance ${dist}`);
                break;
            }

            const pieceAtTarget = findPieceAtCoord(targetCoord);

            // Determine if THIS square is a valid LANDING spot
            let isValidLandingSpot = false;
            if (!pieceAtTarget) { // Empty is always a valid landing spot
                isValidLandingSpot = true;
            } else if (hazardType === 'Grave Dust' && pieceAtTarget.type === 'vampire') { // GD onto Vamp is valid
                isValidLandingSpot = true;
            } // All other occupied squares are invalid landing spots

            // Add highlight if it's a valid landing spot AND path was clear *up to this point*
            if (isValidLandingSpot) {
                 const targetSquareElement = gameBoard.querySelector(`[data-coord="${targetCoord}"]`);
                 if(targetSquareElement) {
                     targetSquareElement.classList.add('valid-target');
                     // console.log(`Highlighting ${targetCoord} as valid target.`); // Optional debug
                 }
            } else {
                 console.log(`Square ${targetCoord} is not a valid landing spot for ${hazardType}.`);
            }

            // Now check if the piece AT the target square blocks the path for *subsequent* squares
            // Updated Rule: Vampires, Bloodwells, Tombstones, Dynamite block the path.
            if (pieceAtTarget && (
                pieceAtTarget.type === 'vampire' ||
                pieceAtTarget.type === 'bloodwell' ||
                (pieceAtTarget.type === 'hazard' && (pieceAtTarget.piece.type === 'Tombstone' || pieceAtTarget.piece.type === 'Dynamite'))
               )) {
                console.log(`Path blocked at ${targetCoord} by ${pieceAtTarget.piece?.type || pieceAtTarget.type}. Stopping check beyond here.`);
                pathClear = false; // Path is blocked *beyond* this square
                // NOTE: We don't 'break' here immediately. We finish processing *this* square
                // (e.g., highlighting it if it was GD->Vamp), but the flag prevents
                // processing squares further away in the next iteration.
            }

            // Move "current path check" forward for the next iteration
            currentPathCoord = targetCoord;
        }
    }

    /**
 * Processes a queue of Dynamite explosion coordinates, handling chain reactions.
 * @param {string[]} explosionQueue - An array of coordinates where Dynamite needs to explode.
 * @param {Set<string>} processedExplosions - A Set tracking coordinates already exploded in this chain.
 */
function processExplosionQueue(explosionQueue, processedExplosions) {
    let needsEliminationCheck = false; // Flag to check elimination after the whole chain

    // Keep processing as long as there are explosions queued up
    while (explosionQueue.length > 0) {
        const coordToExplode = explosionQueue.shift(); // Get the next coordinate from the front of the queue

        // 1. Skip if this coordinate has already exploded in this chain reaction
        if (processedExplosions.has(coordToExplode)) {
            console.log(`Skipping already processed explosion at ${coordToExplode}`);
            continue;
        }

        // 2. Mark this coordinate as processed for this chain
        processedExplosions.add(coordToExplode);

        // 3. Verify Dynamite still exists (might have been destroyed by a previous blast in the chain)
        const dynamitePieceInfo = findPieceAtCoord(coordToExplode);
        if (!dynamitePieceInfo || dynamitePieceInfo.type !== 'hazard' || dynamitePieceInfo.piece.type !== 'Dynamite') {
            console.log(`No Dynamite found at ${coordToExplode} (already destroyed?), skipping explosion.`);
            continue; // Skip if no dynamite is actually here anymore
        }

        // 4. It exists! Log and Remove the Dynamite
        console.log(`Exploding Dynamite at ${coordToExplode}`);
        addToLog(`Chain reaction: Dynamite EXPLODES at ${coordToExplode}!`);
        currentGameState.board.hazards = currentGameState.board.hazards.filter(h => h.coord !== coordToExplode);

        // 5. Get the 3x3 blast area
        const explosionAreaCoords = getCoordsInArea(coordToExplode, 1);

        // 6. Process effects within the blast area
        explosionAreaCoords.forEach(coordInBlast => {
            // Optional Rule Check: Should the center square be affected?
            // if (coordInBlast === coordToExplode) return; // Uncomment to skip the exact center

            const pieceInBlast = findPieceAtCoord(coordInBlast);

            if (pieceInBlast) {
                const affectedPiece = pieceInBlast.piece;
                const affectedType = pieceInBlast.type;

                // Apply Effects based on what was hit in the blast
                if (affectedType === 'bloodwell') {
                    console.log(`Explosion destroyed Bloodwell ${affectedPiece.id} at ${coordInBlast}`);
                    addToLog(`Explosion destroyed Bloodwell ${affectedPiece.id} at ${coordInBlast}!`);
                    currentGameState.board.bloodwells = currentGameState.board.bloodwells.filter(bw => bw.id !== affectedPiece.id);
                    needsEliminationCheck = true; // Mark that we need to check eliminations later
                } 
                // Check if it's a hazard AND it's NOT a dynamite that's already exploded in this chain
                else if (affectedType === 'hazard') {
                    if (affectedPiece.type === 'Dynamite') {
                        // Found another Dynamite! Add it to the queue IF it hasn't been processed.
                        if (!processedExplosions.has(affectedPiece.coord)) {
                             // Only add if it hasn't already exploded its own radius
                             // Verification that it *still* exists isn't strictly needed here,
                             // the check at the start of the while loop handles that.
                             console.log(`Explosion triggers another Dynamite at ${affectedPiece.coord}. Adding to queue.`);
                             addToLog(`Explosion triggers nearby Dynamite at ${affectedPiece.coord}!`);
                             if (!explosionQueue.includes(affectedPiece.coord)) { // Avoid adding duplicates to queue
                                explosionQueue.push(affectedPiece.coord);
                             }
                        }
                    } else { 
                        // It's a different type of hazard (Tombstone, BW, GD)
                        console.log(`Explosion destroyed Hazard (${affectedPiece.type}) at ${coordInBlast}`);
                        addToLog(`Explosion destroyed Hazard (${affectedPiece.type}) at ${coordInBlast}!`);
                        currentGameState.board.hazards = currentGameState.board.hazards.filter(h => h.coord !== affectedPiece.coord);
                    }
                } 
                else if (affectedType === 'vampire') {
                    // TODO: Determine explosion effect on Vampires based on game rules
                    console.log(`Explosion hit Vampire ${affectedPiece.id} at ${coordInBlast}. (Effect TBD)`);
                    addToLog(`Explosion hit Vampire ${affectedPiece.id} at ${coordInBlast}. (Effect TBD)`);
                }
            } // end if(pieceInBlast)
        }); // end forEach coordInBlast

    } // end while(explosionQueue.length > 0)

    console.log("Chain reaction processing complete.");

    // 7. After the entire chain reaction is finished, re-render the board once
    renderBoard(currentGameState); // Update board visually
    updateUI(); // Update AP etc. (though AP was spent on the shot, not explosions)

    // 8. Check for player elimination if any bloodwells were destroyed during the chain
    if (needsEliminationCheck) {
        console.log("Checking elimination status after chain reaction.");
        // Inside processExplosionQueue, AFTER the while loop finishes...

        if (needsEliminationCheck) {
            console.log("Checking elimination status for all players after chain reaction.");
            addToLog("Checking player elimination status...");
            let anEliminationOccurred = false;
            // Check all players to see if the chain reaction eliminated anyone
            for (let i = 0; i < currentGameState.players.length; i++) {
                // Only check players not already marked as eliminated
                if (!currentGameState.players[i].eliminated) {
                    if (checkPlayerElimination(i)) {
                        handlePlayerElimination(i);
                        anEliminationOccurred = true; // Flag that at least one elimination happened
                    }
                }
            }
            // Now, check if the game ended AFTER handling all eliminations from the chain
            if (anEliminationOccurred) {
                checkGameEnd();
            }
        }
        addToLog("Checking player elimination status...");
    }
}

/**
 * Checks if a specific player should be eliminated based on game state.
 * @param {number} playerIndex - The index of the player to check.
 * @returns {boolean} - True if the player is eliminated, false otherwise.
 */
function checkPlayerElimination(playerIndex) {
    if (!currentGameState || !currentGameState.players[playerIndex] || currentGameState.players[playerIndex].eliminated) {
        return false; // Already eliminated or invalid index
    }

    const remainingVamps = currentGameState.board.vampires.filter(v => v.player === playerIndex).length;
    const remainingBloodwells = currentGameState.board.bloodwells.filter(bw => bw.player === playerIndex).length;

    const isEliminated = (remainingVamps === 0 || remainingBloodwells === 0);

    if (isEliminated) {
        console.log(`Player <span class="math-inline">\{playerIndex\} \(</span>{currentGameState.players[playerIndex].name}) elimination condition met.`);
    }

    return isEliminated;
}

/**
 * Handles the consequences of a player being eliminated.
 * @param {number} playerIndex - The index of the eliminated player.
 */
function handlePlayerElimination(playerIndex) {
    if (!currentGameState || !currentGameState.players[playerIndex] || currentGameState.players[playerIndex].eliminated) {
        return; // Prevent double handling
    }

    const playerName = currentGameState.players[playerIndex].name;
    currentGameState.players[playerIndex].eliminated = true; // Mark as eliminated in player data

    addToLog(`--- PLAYER ELIMINATED: ${playerName} ---`);
    console.log(`Handling elimination for Player <span class="math-inline">\{playerIndex\} \(</span>{playerName})`);

    // Remove remaining pieces from the board state
    currentGameState.board.vampires = currentGameState.board.vampires.filter(v => v.player !== playerIndex);
    currentGameState.board.bloodwells = currentGameState.board.bloodwells.filter(bw => bw.player !== playerIndex);
    // Note: Hazards are not player-specific, they remain.

    // Display the elimination popup
    const elimPopup = popups.elimination; // Using the popups object defined earlier
    const elimMsg = document.getElementById('elimination-message');
    if (elimPopup && elimMsg) {
        elimMsg.textContent = `<span class="math-inline">\{playerName\} \(</span>{currentGameState.players[playerIndex].class}) has been eliminated!`;
        elimPopup.style.display = 'flex'; // Show the popup
    } else {
        console.error("Elimination popup elements not found!");
    }

    // Re-render the board to show removed pieces
    renderBoard(currentGameState);
    updateUI(); // Update player info (though eliminated player won't have a turn)
}

/**
 * Checks if the game has ended (only one player left) and handles victory.
 * @returns {boolean} - True if the game has ended, false otherwise.
 */
function checkGameEnd() {
    if (!currentGameState || !currentGameState.players) return false;

    const activePlayers = currentGameState.players.filter(p => !p.eliminated);

    if (activePlayers.length === 1) {
        // Game Over - We have a winner!
        const winner = activePlayers[0];
        console.log(`Game Over! Winner: ${winner.name}`);
        addToLog(`*** GAME OVER! <span class="math-inline">\{winner\.name\} \(</span>{winner.class}) WINS! ***`);

        // Display victory popup
        const victoryPopup = popups.victory;
        const victoryMsg = document.getElementById('victory-message');
        if (victoryPopup && victoryMsg) {
            victoryMsg.textContent = `<span class="math-inline">\{winner\.name\} \(</span>{winner.class}) claims the Dreadwood!`;
            victoryPopup.style.display = 'flex';
        } else {
            console.error("Victory popup elements not found!");
        }
        // Disable further actions? Or rely on restart button? For now, just show popup.
        // Could disable End Turn, action buttons etc. here.
        btnEndTurn.disabled = true; // Example: Disable end turn on victory

        return true; // Game has ended
    } else if (activePlayers.length === 0) {
        // Should not happen with "last faction standing" rule, but handle defensively
        console.log("Game Over! No active players left? Draw?");
        addToLog("*** GAME OVER! DRAW? (No players left) ***");
        // TODO: Handle draw scenario if needed by rules, maybe show a different popup?
        return true; // Game has ended (in a weird state)
    }

    return false; // Game continues
}

// --- Initialization ---
function initializeGame() {
    console.log("Entering initializeGame. playerData:", JSON.stringify(playerData)); // <-- ADD THIS
    console.log("Initializing game...");
    // ... rest of function
    gameHistory = [];
    
    const layouts = LAYOUT_DATA[numberOfPlayers];
    if (!layouts?.length) {
        alert(`Error: No layouts for ${numberOfPlayers}P!`);
        showScreen('playerCount');
        return;
    }
    
    const layoutIdx = Math.floor(Math.random() * layouts.length);
    const layout = layouts[layoutIdx];
    const layoutName = `${numberOfPlayers}P Layout #${layoutIdx + 1}`;
    console.log(`Selected ${layoutName}`);
    
    currentGameState = {
        players: playerData.map(p => ({
            name: p.name,
            class: p.class,
            eliminated: false
        })),
        board: {
            vampires: JSON.parse(JSON.stringify(layout.vampires.map(v => ({
                ...v,
                cursed: false,
                movesThisTurn: 0
            })))), // << Comma IS needed here
            bloodwells: JSON.parse(JSON.stringify(layout.bloodwells)), // << Comma IS needed here
            hazards: JSON.parse(JSON.stringify(layout.hazards)) // << NO comma needed here
        }, // << Comma IS needed here before hazardPool
        hazardPool: {
            'Tombstone': 4 - layout.hazards.filter(h => h.type === 'Tombstone').length,
            'Black Widow': 4 - layout.hazards.filter(h => h.type === 'Black Widow').length,
            'Grave Dust': 4 - layout.hazards.filter(h => h.type === 'Grave Dust').length,
            'Dynamite': 3
        },
        playerResources: playerData.map(() => ({
            silverBullet: 1,
            abilitiesUsed: []
        })),
        turn: 1,
        currentPlayerIndex: 0,
        currentAP: 0,
        selectedVampireId: null,
        actionState: {
            pendingAction: null,
            selectedHazardType: null
        }
    };
    
    const pIdx = currentGameState.currentPlayerIndex;
    if (currentGameState.turn === 1) {
        if (numberOfPlayers === 4) 
            currentGameState.currentAP = [4, 5, 6, 8][pIdx];
        else if (numberOfPlayers === 3) 
            currentGameState.currentAP = 6;
        else if (numberOfPlayers === 2) 
            currentGameState.currentAP = 5;
        else 
            currentGameState.currentAP = 5;
    }
    
    console.log(`*** Calculated Initial AP: ${currentGameState.currentAP} (for player index ${pIdx}, num players ${numberOfPlayers}) ***`);
    
    generateGrid();
    renderBoard(currentGameState);
    
    // Inside initializeGame...
    const player = currentGameState.players[pIdx];
    if (!player) { console.error("Init fail: Player not found at index", pIdx); return; } // Safety check
    const resources = currentGameState.playerResources[pIdx];
    if (!resources) { console.error("Init fail: Resources not found at index", pIdx); return; } // Safety check

    // --- ADD THIS LOG ---
    console.log('Data FOR updatePlayerInfoPanel:', {
        pIdx: pIdx,
        player: player,
        resources: resources,
        turn: currentGameState.turn,
        ap: currentGameState.currentAP
    });
    // --- END LOG ---

    updatePlayerInfoPanel(player, currentGameState.turn, currentGameState.currentAP, resources);
    // ... rest of function
      
    logList.innerHTML = `<li>Game Started: ${layoutName}</li>`;
    gameLog.scrollTop = 0;
    btnUndo.disabled = true;
    
    if (movementBar) 
        movementBar.classList.add('hidden');
    
    gameBoard.removeEventListener('click', handleBoardClick);
    gameBoard.addEventListener('click', handleBoardClick);
    btnUndo.removeEventListener('click', undoLastAction);
    btnUndo.addEventListener('click', undoLastAction);
    btnEndTurn.removeEventListener('click', nextTurn);
    btnEndTurn.addEventListener('click', nextTurn);
    
    showScreen('gameplay');
    addToLog(`--- Turn ${currentGameState.turn} - ${player.name}'s turn (${player.class}). AP: ${currentGameState.currentAP} ---`);
}
    // --- 5. Attach Event Listeners (Executed ONCE on script load) --- // Note: Original numbering kept, this is Section 4 of pasting

    // Setup Screens Listeners
    playerCountButtons.forEach(button => {
        button.addEventListener('click', () => {
            numberOfPlayers = parseInt(button.dataset.count);
            playerData = new Array(numberOfPlayers); // Create array for player data
            selectedClasses = []; // Reset selections for new setup process
            updatePlayerSetupScreen(0); // Setup screen for Player 1 (index 0)
            showScreen('playerSetup');
        });
    });

    // Listener for the new "Back to Start" button
    if (btnBackToStart) { // Check if the button exists
        btnBackToStart.addEventListener('click', () => {
            if (confirm("Return to player count selection? All setup progress will be lost.")) {
                // Reset setup state completely
                numberOfPlayers = 0;
                currentPlayerSetupIndex = 0;
                playerData = [];
                selectedClasses = [];
                // Hide player setup and show player count screen
                showScreen('playerCount');
                console.log("Returned to player count screen. Setup state reset.");
            }
        });
    }
    // Help Button Listener
    if(btnHelp) {
        btnHelp.addEventListener('click', () => {
            console.log("Help button clicked");
            // Show the popup first
            showScreen('howToPlay'); // Should use popups['howToPlay'].style.display = 'flex'; from revised showScreen

            // Find the scrollable content area inside the popup
            const howToPlayContent = popups.howToPlay?.querySelector('.how-to-play-content');

            // Reset its scroll position to the top
            if (howToPlayContent) {
                howToPlayContent.scrollTop = 0;
                console.log("Reset How-to-Play scroll position.");
            }
        });
    }

    // Back from How-to-Play Listener (Simpler - Just Hide Popup)
    if(btnBackToGame) {
        btnBackToGame.addEventListener('click', () => {
            console.log("Back to Game button clicked, hiding HowToPlay popup.");
            if (popups.howToPlay) {
                popups.howToPlay.style.display = 'none'; // Hide the popup
            }
            // The underlying screen (stored in lastActiveScreenId) should still be active.
        });
    }
    // Movement D-Pad Button Listeners (NEW)
    // Helper function to handle clicks on any movement arrow
    const handleMovementButtonClick = (direction) => {
        console.log(`Movement button clicked: ${direction}`); // For debugging
        // Ensure game state is ready
        if (!currentGameState || !currentGameState.board || !currentGameState.players) {
             console.error("Movement click failed: Game state not ready.");
             return;
        }
        // Find the selected vampire
        const selectedVamp = findVampireById(currentGameState.selectedVampireId);
        if (!selectedVamp) {
            addToLog("Select a Vampire first.");
            return;
        }

        // Check if the clicked direction matches the vampire's current facing
        if (direction === selectedVamp.facing) {
             // --- Attempt MOVE action ---
             addToLog(`Attempting Move ${direction}...`);
             const targetCoord = getAdjacentCoord(selectedVamp.coord, selectedVamp.facing);
             if (targetCoord) {
                  // executeMove function handles AP checks, validation, state change, rendering, UI update
                  executeMove(selectedVamp, targetCoord);
             } else {
                  addToLog("Cannot move forward off the board.");
             }
        } else {
             // --- Attempt PIVOT action ---
             addToLog(`Attempting Pivot to ${direction}...`);
             // executePivot function handles AP checks, state change, rendering, UI update
             executePivot(selectedVamp, direction);
        }
    };
    

    // Attach the handler to each d-pad button
    // Use optional chaining on button references in case HTML elements aren't found
    btnMoveN?.addEventListener('click', () => handleMovementButtonClick('N'));
    btnMoveE?.addEventListener('click', () => handleMovementButtonClick('E'));
    btnMoveS?.addEventListener('click', () => handleMovementButtonClick('S'));
    btnMoveW?.addEventListener('click', () => handleMovementButtonClick('W'));

    classButtons.forEach(button => {
        button.addEventListener('click', () => { // This listener enables btnNext
            if (button.disabled) return; // Ignore clicks if button already used by another player
            let currentlySelected = classSelectionContainer.querySelector('.selected');
            if (currentlySelected) {
                currentlySelected.classList.remove('selected'); // Deselect previous
            }
            button.classList.add('selected'); // Highlight clicked button
            const selectedClass = button.dataset.class;
            if (playerData[currentPlayerSetupIndex]) {
                playerData[currentPlayerSetupIndex].class = selectedClass; // Store selection in player data
            }
            displayClassDetails(selectedClass); // Show details for the selected class
            btnNext.disabled = false; // Enable Next button since a class is now chosen
        });
    });

    playerNameInput.addEventListener('input', () => {
        // Update player name in state as user types, use default if empty
        if (playerData[currentPlayerSetupIndex]) {
            playerData[currentPlayerSetupIndex].name = playerNameInput.value.trim() || `P${currentPlayerSetupIndex + 1}`;
        }
    });

    // Back Button (Player Setup) Listener - REVISED LOGIC
    btnBack.addEventListener('click', () => {
        console.log("Back button clicked");

        if (currentPlayerSetupIndex > 0) {
            // Determine the new index we are going back TO
            const newPlayerIndex = currentPlayerSetupIndex - 1;

            // --- Revised Logic ---
            // Rebuild the selectedClasses array based ONLY on players BEFORE the one we are going back to.
            // This ensures only confirmed previous selections block buttons.
            selectedClasses = []; // Start fresh
            for (let i = 0; i <= newPlayerIndex; i++) { // Loop up to AND INCLUDING the new player index being setup
                 // We actually only care about classes selected *before* the current setup player
                 if (i < newPlayerIndex && playerData[i]?.class) {
                    selectedClasses.push(playerData[i].class);
                 }
                 // Also clear the data for players *after* the one we are returning to
                 if (i > newPlayerIndex && playerData[i]) {
                      playerData[i] = { name: `P${i + 1}`, class: null };
                 }
            }
             // Clear the data for the player we just left (whose choice shouldn't count anymore)
             // This was moved from the old logic, ensure it happens
             if (playerData[currentPlayerSetupIndex]) {
                 playerData[currentPlayerSetupIndex] = { name: `P${currentPlayerSetupIndex + 1}`, class: null };
             }

            console.log("Rebuilt selectedClasses for Back:", selectedClasses);
            // --- End Revised Logic ---

            // Go back to previous player's setup screen using the new index
            updatePlayerSetupScreen(newPlayerIndex);

        } else {
            // If already on Player 1, going back goes to player count selection
             playerData = []; // Clear all player data
             selectedClasses = []; // Clear selected classes
            showScreen('playerCount');
        }
    });

    // Next / Start Game Button Listener (Corrected - No Alert)
    btnNext.addEventListener('click', () => {
        console.log("Next/Start Game button clicked");
        const currentPlayerData = playerData[currentPlayerSetupIndex];

        // Button should be disabled if no class selected, but double check state
        if (!currentPlayerData || !currentPlayerData.class) {
             console.error("Next clicked but no class selected!");
             // Optionally provide non-alert feedback, like flashing class buttons
             return; // Prevent proceeding
        }

        // Ensure name is set
        if (!currentPlayerData.name || currentPlayerData.name.trim() === '') {
            currentPlayerData.name = `P${currentPlayerSetupIndex + 1}`;
            playerData[currentPlayerSetupIndex].name = currentPlayerData.name; // Update array
        }

        // Add selected class to the list to disable it for subsequent players
        if (!selectedClasses.includes(currentPlayerData.class)) {
             selectedClasses.push(currentPlayerData.class);
             console.log("Added class to selected list:", currentPlayerData.class, selectedClasses);
        }

        // Proceed
        if (currentPlayerSetupIndex < numberOfPlayers - 1) {
            updatePlayerSetupScreen(currentPlayerSetupIndex + 1);
        } else {
             initializeGame(); // Last player, initialize game state and board
        }
    });

    // Gameplay Screen Global Listeners (Available whenever gameplay screen is active)
    btnToggleLog.addEventListener('click', () => {
        gameLog.classList.toggle('log-hidden');
        // Scroll to bottom when showing log if needed
        if (!gameLog.classList.contains('log-hidden')) {
             gameLog.scrollTop = gameLog.scrollHeight;
        }
    });

    btnBackToSetup.addEventListener('click', () => { // Dev button to restart setup
        if (confirm("Return to setup? Game progress will be lost.")) {
            // Reset all state variables
            numberOfPlayers = 0;
            currentPlayerSetupIndex = 0;
            playerData = [];
            selectedClasses = [];
            currentGameState = {};
            gameHistory = [];
            // TODO: Add reset for any other state added later
            console.log("Returning to setup - game state cleared.");
            showScreen('playerCount'); // Show the first screen
        }
    });

    // Action Buttons Listeners (Gameplay Screen)
    btnShoot.addEventListener('click', () => {
        const vamp = findVampireById(currentGameState?.selectedVampireId); // Use optional chaining
        if (vamp) {
            executeShoot(vamp, false); // Execute normal shot
        } else {
            addToLog("Select a Vampire to Shoot.");
        }
    });

    btnSilverBullet.addEventListener('click', () => {
        const vamp = findVampireById(currentGameState?.selectedVampireId);
        if(!currentGameState || !currentGameState.playerResources) return; // Safety check
        const res = currentGameState.playerResources[currentGameState.currentPlayerIndex];
        if (vamp && res.silverBullet > 0) {
            if (confirm("Use your only Silver Bullet?")) { // Confirmation
                executeShoot(vamp, true); // Execute silver bullet shot
            }
        } else if (!vamp) {
            addToLog("Select a Vampire to use Silver Bullet.");
        } else {
            addToLog("No Silver Bullet left.");
        }
    });

    btnThrow.addEventListener('click', () => {
        const vamp = findVampireById(currentGameState?.selectedVampireId);
        if (!vamp) { addToLog("Select Vampire to Throw."); return; }
        if (vamp.cursed) { addToLog("Cursed vampires cannot throw."); return; }
        // Check base AP cost (>=1) - specific cost checked in picker handler
        if (!currentGameState || typeof currentGameState.currentAP === 'undefined' || currentGameState.currentAP < AP_COST.THROW_HAZARD) {
            addToLog("Not enough AP to initiate Throw."); return;
        }
        // Open the hazard picker
        populateHazardPicker(); // Fill picker with current options/counts
        popups.hazardPicker.style.display = 'flex'; // Show the popup
        if(currentGameState && currentGameState.actionState) currentGameState.actionState.pendingAction = 'throw-select-hazard';
        addToLog("Select hazard type to throw.");
    });

    btnCancelThrow.addEventListener('click', () => {
        // Logic for cancelling the throw action from the picker
        popups.hazardPicker.style.display = 'none'; // Hide the popup
        if (currentGameState && currentGameState.actionState) {
             currentGameState.actionState = { pendingAction: null, selectedHazardType: null };
        }
        clearHighlights(); // Remove any target highlights
        addToLog("Throw action cancelled.");
    });

    hazardPickerOptions.addEventListener('click', (event) => {
        // Handle clicks within the hazard picker using event delegation
        const button = event.target.closest('button');
        if (button && button.dataset.hazardType) {
            handleHazardSelection(button.dataset.hazardType); // Process selected hazard
        }
    });

    // Note: Listeners for gameBoard, btnUndo, btnEndTurn are attached inside initializeGame function

    // --- 6. Initial Call --- // Note: Original numbering kept, this is Section 5 of pasting
    showScreen('playerCount'); // Start the application by showing the player count selection screen

}); // End DOMContentLoaded <-- Add the line ABOVE this closing brace and parenthesis
