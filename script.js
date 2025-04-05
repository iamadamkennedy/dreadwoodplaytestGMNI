document.addEventListener('DOMContentLoaded', () => {

    // --- 1. Top-Level State Variables ---
    let numberOfPlayers = 0;
    let currentPlayerSetupIndex = 0;
    let playerData = []; // Array to hold { name: 'P1', class: null } objects
    let selectedClasses = []; // Keep track of classes chosen so far in setup
    let currentGameState = {}; // Main object holding all game info
    let gameHistory = []; // Stores previous game states for Undo

    // --- 2. Constants ---
    const AP_COST = {
        MOVE: 1, PIVOT: 1, SHOOT: 3, SILVER_BULLET: 3,
        THROW_HAZARD: 1, // Base cost for Tombstone, Carcass, Grave Dust
        THROW_DYNAMITE: 2,
        // Add other action costs (Dispel, Bite Fuse, Abilities) here later
    };
    const DIRECTIONS = ['N', 'E', 'S', 'W'];
    const CLASS_DATA = { // Includes Narrative Descriptions & Colors
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
    const LAYOUT_DATA = { // Example Layouts - Add all 26 per count later!
        '2': [
             { // Layout 2P-1 (Example from rules)
                vampires: [ { player: 0, coord: 'A2', facing: 'S', id: 'P1V1' }, { player: 0, coord: 'C4', facing: 'S', id: 'P1V2' }, { player: 1, coord: 'A7', facing: 'N', id: 'P2V1' }, { player: 1, coord: 'C9', facing: 'N', id: 'P2V2' } ],
                bloodwells: [ { player: 0, coord: 'B1', id: 'P1BW1' }, { player: 0, coord: 'D3', id: 'P1BW2' }, { player: 0, coord: 'F2', id: 'P1BW3' }, { player: 1, coord: 'B6', id: 'P2BW1' }, { player: 1, coord: 'D8', id: 'P2BW2' }, { player: 1, coord: 'F7', id: 'P2BW3' } ],
                hazards: [ { type: 'Tombstone', coord: 'E5' }, { type: 'Carcass', coord: 'D5' }, { type: 'Grave Dust', coord: 'F5' }, { type: 'Tombstone', coord: 'G5' }, { type: 'Carcass', coord: 'E4' }, { type: 'Grave Dust', coord: 'E6' } ]
            },
            // Add Layout 2P-2 here later if needed...
        ],
        '3': [
             { // Layout 3P-1 (Example from rules)
                 vampires: [ { player: 0, coord: 'A2', facing: 'S', id: 'P1V1' }, { player: 0, coord: 'C4', facing: 'S', id: 'P1V2' }, { player: 1, coord: 'F2', facing: 'S', id: 'P2V1' }, { player: 1, coord: 'H4', facing: 'S', id: 'P2V2' }, { player: 2, coord: 'D8', facing: 'N', id: 'P3V1' }, { player: 2, coord: 'F9', facing: 'N', id: 'P3V2' } ],
                 bloodwells: [ { player: 0, coord: 'B1', id: 'P1BW1' }, { player: 0, coord: 'D3', id: 'P1BW2' }, { player: 0, coord: 'A5', id: 'P1BW3' }, { player: 1, coord: 'G1', id: 'P2BW1' }, { player: 1, coord: 'I3', id: 'P2BW2' }, { player: 1, coord: 'G5', id: 'P2BW3' }, { player: 2, coord: 'C7', id: 'P3BW1' }, { player: 2, coord: 'E6', id: 'P3BW2' }, { player: 2, coord: 'G8', id: 'P3BW3' } ],
                 hazards: [ { type: 'Tombstone', coord: 'E5' }, { type: 'Carcass', coord: 'D5' }, { type: 'Grave Dust', coord: 'F5' }, { type: 'Tombstone', coord: 'G5' }, { type: 'Carcass', coord: 'H5' }, { type: 'Grave Dust', coord: 'B7' } ]
             },
             // Add Layout 3P-2 here later if needed...
        ],
        '4': [
             { // Layout 4P-1 (Example from rules)
                 vampires: [ { player: 0, coord: 'A2', facing: 'S', id: 'P1V1' }, { player: 0, coord: 'C4', facing: 'S', id: 'P1V2' }, { player: 1, coord: 'F2', facing: 'S', id: 'P2V1' }, { player: 1, coord: 'H4', facing: 'S', id: 'P2V2' }, { player: 2, coord: 'A7', facing: 'N', id: 'P3V1' }, { player: 2, coord: 'C9', facing: 'N', id: 'P3V2' }, { player: 3, coord: 'F7', facing: 'N', id: 'P4V1' }, { player: 3, coord: 'H9', facing: 'N', id: 'P4V2' } ],
                 bloodwells: [ { player: 0, coord: 'B1', id: 'P1BW1' }, { player: 0, coord: 'D3', id: 'P1BW2' }, { player: 0, coord: 'A3', id: 'P1BW3' }, { player: 1, coord: 'G1', id: 'P2BW1' }, { player: 1, coord: 'I3', id: 'P2BW2' }, { player: 1, coord: 'F3', id: 'P2BW3' }, { player: 2, coord: 'B6', id: 'P3BW1' }, { player: 2, coord: 'D8', id: 'P3BW2' }, { player: 2, coord: 'A8', id: 'P3BW3' }, { player: 3, coord: 'G6', id: 'P4BW1' }, { player: 3, coord: 'I8', id: 'P4BW2' }, { player: 3, coord: 'F8', id: 'P4BW3' } ],
                 hazards: [ { type: 'Tombstone', coord: 'E5' }, { type: 'Carcass', coord: 'D5' }, { type: 'Grave Dust', coord: 'F5' }, { type: 'Tombstone', coord: 'G5' }, { type: 'Carcass', coord: 'E4' }, { type: 'Grave Dust', coord: 'E6' } ]
            },
            { // Layout R1 from simulation
                 vampires: [ { player: 0, coord: 'A2', facing: 'S', id: 'S1' }, { player: 0, coord: 'C3', facing: 'S', id: 'S2' }, { player: 1, coord: 'G2', facing: 'S', id: 'V1' }, { player: 1, coord: 'I3', facing: 'S', id: 'V2' }, { player: 2, coord: 'B8', facing: 'N', id: 'O1' }, { player: 2, coord: 'D7', facing: 'N', id: 'O2' }, { player: 3, coord: 'F8', facing: 'N', id: 'B1' }, { player: 3, coord: 'H7', facing: 'N', id: 'B2' } ],
                 bloodwells: [ { player: 0, coord: 'B1', id: 'SBW1' }, { player: 0, coord: 'D2', id: 'SBW2' }, { player: 0, coord: 'A4', id: 'SBW3' }, { player: 1, coord: 'H1', id: 'VBW1' }, { player: 1, coord: 'F2', id: 'VBW2' }, { player: 1, coord: 'I4', id: 'VBW3' }, { player: 2, coord: 'C9', id: 'OBW1' }, { player: 2, coord: 'A7', id: 'OBW2' }, { player: 2, coord: 'D9', id: 'OBW3' }, { player: 3, coord: 'G9', id: 'BBW1' }, { player: 3, coord: 'I7', id: 'BBW2' }, { player: 3, coord: 'F9', id: 'BBW3' } ],
                 hazards: [ { type: 'Tombstone', coord: 'D5' }, { type: 'Tombstone', coord: 'F5' }, { type: 'Carcass', coord: 'E4' }, { type: 'Carcass', coord: 'E6' }, { type: 'Grave Dust', coord: 'D4' }, { type: 'Grave Dust', coord: 'F6' } ]
             }
             // Add more 4P layouts here...
        ]
    }; // NOTE: Remember to add more layouts later!

    // --- 3. DOM Element References --- // Note: Original numbering kept for internal reference, this is Section 2 of pasting sequence
    // Screens & Popups
    const screens = {
        playerCount: document.getElementById('screen-player-count'),
        playerSetup: document.getElementById('screen-player-setup'),
        gameplay: document.getElementById('screen-gameplay'),
    };
    const popups = {
       elimination: document.getElementById('popup-elimination'),
       victory: document.getElementById('popup-victory'),
       hazardPicker: document.getElementById('hazard-picker') // Reference the hazard picker popup
    };

    // Player Count Screen Elements
    const playerCountButtons = screens.playerCount.querySelectorAll('button[data-count]');

    // Player Setup Screen Elements
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

    // Gameplay Screen Elements
    const gameplayScreen = screens.gameplay; // Alias for convenience
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

    // --- 4. Function Definitions --- // Note: Original numbering kept, this is Section 3 of pasting

    // --- Coordinate Helper Functions ---
    function getRowColFromCoord(coord) { if (!coord || coord.length < 2) return null; const colLetter = coord.charAt(0).toUpperCase(); const rowNum = parseInt(coord.substring(1)); if (isNaN(rowNum) || colLetter < 'A' || colLetter > 'I' || rowNum < 1 || rowNum > 9) return null; return { row: rowNum, col: colLetter.charCodeAt(0) - 64 }; }
    function getCoordFromRowCol(row, col) { if (row < 1 || row > 9 || col < 1 || col > 9) return null; const colLetter = String.fromCharCode(64 + col); return `${colLetter}${row}`; }
    function getAdjacentCoord(coord, direction) { const rc = getRowColFromCoord(coord); if (!rc) return null; let { row, col } = rc; if (direction === 'N') row--; else if (direction === 'S') row++; else if (direction === 'E') col++; else if (direction === 'W') col--; return getCoordFromRowCol(row, col); }
    function getAllAdjacentCoords(coord) { const adjacentCoords = []; const rc = getRowColFromCoord(coord); if (!rc) return adjacentCoords; for (let dr = -1; dr <= 1; dr++) { for (let dc = -1; dc <= 1; dc++) { if (dr === 0 && dc === 0) continue; const adjRow = rc.row + dr; const adjCol = rc.col + dc; const adjCoord = getCoordFromRowCol(adjRow, adjCol); if (adjCoord) adjacentCoords.push(adjCoord); } } return adjacentCoords; }
    function getNewFacing(currentFacing, pivotType) { const currentIndex = DIRECTIONS.indexOf(currentFacing); if (currentIndex === -1) return currentFacing; let newIndex; if (pivotType === 'L') newIndex = (currentIndex - 1 + DIRECTIONS.length) % DIRECTIONS.length; else if (pivotType === 'R') newIndex = (currentIndex + 1) % DIRECTIONS.length; else if (pivotType === '180') newIndex = (currentIndex + 2) % DIRECTIONS.length; else return currentFacing; return DIRECTIONS[newIndex]; }
    function getDistance(coord1, coord2) { const rc1 = getRowColFromCoord(coord1); const rc2 = getRowColFromCoord(coord2); if (!rc1 || !rc2) return Infinity; return Math.abs(rc1.row - rc2.row) + Math.abs(rc1.col - rc2.col); }

    // --- UI Helper Functions ---
    function showScreen(screenId) { Object.values(screens).forEach(screen => screen.classList.remove('active')); if (screens[screenId]) screens[screenId].classList.add('active'); else console.error(`Screen "${screenId}" not found.`); console.log(`Showing screen: ${screenId}`); }
    function displayClassDetails(className) { const data = CLASS_DATA[className]; const nameEl = document.getElementById('class-name'); const descEl = document.getElementById('class-description'); const abilitiesEl = document.getElementById('class-abilities'); const containerEl = document.getElementById('class-details-container'); if (data) { nameEl.innerHTML = `<strong>Class:</strong> ${className}`; descEl.textContent = data.description; abilitiesEl.innerHTML = ''; data.abilities.forEach(ability => { const li = document.createElement('li'); li.innerHTML = `<strong>${ability.name}:</strong> ${ability.description}`; abilitiesEl.appendChild(li); }); containerEl.style.display = 'block'; } else { nameEl.innerHTML = `<strong>Class:</strong> ---`; descEl.textContent = 'Select a class...'; abilitiesEl.innerHTML = '<li>---</li>'; } }
    function updatePlayerSetupScreen(playerIndex) { const playerNum = playerIndex + 1; currentPlayerSetupIndex = playerIndex; console.log(`Setting up for P${playerNum}`); if (!playerData[playerIndex]) playerData[playerIndex] = { name: `P${playerNum}`, class: null }; else playerData[playerIndex].class = null; playerNameInput.value = playerData[playerIndex].name !== `P${playerNum}` ? playerData[playerIndex].name : ''; playerNameInput.placeholder = `P${playerNum} Name (Optional)`; playerSetupTitle.textContent = `Player ${playerNum} Setup`; playerNameLabel.textContent = `Player ${playerNum} Name:`; let selBtn = classSelectionContainer.querySelector('.selected'); if (selBtn) selBtn.classList.remove('selected'); classButtons.forEach(button => { const cls = button.dataset.class; button.disabled = selectedClasses.includes(cls); button.style.opacity = button.disabled ? '0.5' : '1'; }); displayClassDetails(null); btnBack.style.display = (playerIndex === 0) ? 'none' : 'inline-block'; btnNext.textContent = (playerIndex === numberOfPlayers - 1) ? 'Start Game' : 'Next'; btnNext.disabled = true; /* Start disabled */ }
    function addToLog(message) { const li = document.createElement('li'); li.textContent = message; while (logList.children.length > 50) logList.removeChild(logList.firstChild); logList.appendChild(li); if (gameLog && !gameLog.classList.contains('log-hidden')) gameLog.scrollTop = gameLog.scrollHeight; console.log("Log:", message); }
    function generateGrid() { gameBoard.innerHTML = ''; for (let r = 1; r <= 9; r++) { for (let c = 1; c <= 9; c++) { const square = document.createElement('div'); const colLetter = String.fromCharCode(64 + c); const coord = `${colLetter}${r}`; square.classList.add('grid-square'); square.dataset.coord = coord; gameBoard.appendChild(square); } } console.log("Generated grid."); }
    function getPlayerColorClass(playerIndex) { const player = currentGameState.players?.[playerIndex]; return player ? (CLASS_DATA[player.class]?.color || '') : ''; }
    function clearHighlights() { document.querySelectorAll('.grid-square.valid-target, .grid-square.invalid-target').forEach(el => el.classList.remove('valid-target', 'invalid-target')); }

    // --- Board Rendering & Gameplay UI Update ---

    // Renders pieces on the board based on game state (Updated for Bloodwell Styling)
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
                vampElement.classList.add('piece', 'vampire', classColor); // Vampires keep class background
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
                // const playerClass = gameState.players[bw.player]?.class; // No longer needed for background
                // const classColor = CLASS_DATA[playerClass]?.color || ''; // No longer needed for background

                // --- MODIFIED LINES ---
                bwElement.classList.add('piece', 'bloodwell'); // Add base classes (NO color class here)
                bwElement.classList.add(`player${bw.player}`); // Add player index class (e.g., 'player0', 'player1') for border color CSS rule
                // --- END MODIFICATION ---

                bwElement.dataset.id = bw.id;
                bwElement.dataset.player = bw.player;
                bwElement.textContent = '🩸'; // Blood drop icon
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
    
    function updatePlayerInfoPanel(player, turn, currentAP, resources) { if (!player || !resources || !currentClassDetailsName) { console.error("Info Panel Error."); return; } const data = CLASS_DATA[player.class]; if (data) { currentClassDetailsName.innerHTML = `<strong>Class:</strong> ${player.class}`; currentClassDescription.textContent = data.description; currentClassAbilitiesList.innerHTML = ''; data.abilities.forEach(ability => { const li = document.createElement('li'); const isUsed = resources.abilitiesUsed?.includes(ability.name); li.innerHTML = `<strong>${ability.name}:</strong> ${ability.description}`; if (isUsed) { li.style.opacity = '0.5'; li.style.textDecoration = 'line-through'; } currentClassAbilitiesList.appendChild(li); }); } infoSilverBullet.textContent = resources.silverBullet > 0 ? `Available (${resources.silverBullet})` : "Used"; statusBarPlayer.textContent = player.name; statusBarAP.textContent = currentAP; statusBarTurn.textContent = turn; const canAffordShoot = currentAP >= AP_COST.SHOOT; const canAffordThrowBase = currentAP >= AP_COST.THROW_HAZARD; const canAffordSilver = currentAP >= AP_COST.SILVER_BULLET && resources.silverBullet > 0; const isVampSelected = !!currentGameState.selectedVampireId; const selectedVamp = findVampireById(currentGameState.selectedVampireId); const isCursed = selectedVamp?.cursed; if (btnShoot) btnShoot.disabled = !isVampSelected || !canAffordShoot || isCursed; if (btnThrow) btnThrow.disabled = !isVampSelected || !canAffordThrowBase || isCursed; if (btnSilverBullet) btnSilverBullet.disabled = !isVampSelected || !canAffordSilver || isCursed; }
    function updateUI() { if (!currentGameState?.players?.length || !currentGameState.playerResources?.length) return; const idx = currentGameState.currentPlayerIndex; if (idx < 0 || idx >= currentGameState.players.length || idx >= currentGameState.playerResources.length) { console.error("Error: Invalid idx.", currentGameState); return; } const player = currentGameState.players[idx]; const resources = currentGameState.playerResources[idx]; if (player && resources) updatePlayerInfoPanel(player, currentGameState.turn, currentGameState.currentAP, resources); else console.error("Error fetching player/resources."); }

    // --- Game State & Undo Logic ---
    function saveStateToHistory() { try { gameHistory.push(JSON.parse(JSON.stringify(currentGameState))); btnUndo.disabled = false; console.log("State saved. History:", gameHistory.length); } catch (error) { console.error("Error saving state:", error); alert("Undo Error!"); } }
    function undoLastAction() { if (gameHistory.length > 0) { console.log("Undoing..."); try { currentGameState = gameHistory.pop(); renderBoard(currentGameState); updateUI(); addToLog("--- Action Undone ---"); btnUndo.disabled = gameHistory.length === 0; } catch (error) { console.error("Error restoring state:", error); alert("Undo Restore Error!"); btnUndo.disabled = true; } } else { console.log("Nothing to undo."); btnUndo.disabled = true; } }

    // --- Find Pieces ---
    function findVampireById(vampId) { return currentGameState.board?.vampires?.find(v => v.id === vampId); }
    function findPieceAtCoord(coord) { if (!currentGameState?.board) return null; const vamp = currentGameState.board.vampires?.find(v => v.coord === coord); if (vamp) return { type: 'vampire', piece: vamp }; const bw = currentGameState.board.bloodwells?.find(b => b.coord === coord); if (bw) return { type: 'bloodwell', piece: bw }; const hazard = currentGameState.board.hazards?.find(h => h.coord === coord); if (hazard) return { type: 'hazard', piece: hazard }; return null; }

    // --- Action Execution Functions ---
    function executeMove(vampire, targetCoord) { if (!vampire) return false; const cost = AP_COST.MOVE; if (currentGameState.currentAP < cost) { addToLog("No AP."); return false; } if (vampire.cursed && (vampire.movesThisTurn || 0) >= 1) { addToLog(`Cursed ${vampire.id} already moved.`); return false; } const expectedTarget = getAdjacentCoord(vampire.coord, vampire.facing); if (targetCoord !== expectedTarget) { addToLog(`Invalid move target.`); return false; } const pieceAtTarget = findPieceAtCoord(targetCoord); if (pieceAtTarget && (pieceAtTarget.type === 'vampire' || pieceAtTarget.type === 'bloodwell' || pieceAtTarget.piece.type === 'Carcass')) { addToLog(`Blocked by ${pieceAtTarget.piece?.type || pieceAtTarget.type}.`); return false; } saveStateToHistory(); const oldCoord = vampire.coord; vampire.coord = targetCoord; currentGameState.currentAP -= cost; vampire.movesThisTurn = (vampire.movesThisTurn || 0) + 1; addToLog(`${vampire.id} moved ${oldCoord} -> ${targetCoord}. (${currentGameState.currentAP} AP)`); const hazardLandedOn = currentGameState.board.hazards.find(h => h.coord === targetCoord); if (hazardLandedOn?.type === 'Grave Dust' && !vampire.cursed) { console.log("Curse by GD land."); vampire.cursed = true; addToLog(`${vampire.id} CURSED by Grave Dust!`); } if (vampire.cursed) { const landedOnHazard = !!hazardLandedOn; if (!landedOnHazard) { const adjacentCoords = getAllAdjacentCoords(targetCoord); let foundAdjacentBW = false; let adjacentBWCoord = null; for (const adjCoord of adjacentCoords) { const pieceAtAdj = findPieceAtCoord(adjCoord); if (pieceAtAdj?.type === 'bloodwell' && pieceAtAdj.piece.player === vampire.player) { foundAdjacentBW = true; adjacentBWCoord = adjCoord; break; } } if (foundAdjacentBW) { console.log("Bloodbath cure!"); vampire.cursed = false; vampire.movesThisTurn = 0; addToLog(`${vampire.id} CURED by Bloodbath near ${adjacentBWCoord}!`); } } } console.log(`Move End: ${vampire.id}, Cursed: ${vampire.cursed}, Moves: ${vampire.movesThisTurn}`); renderBoard(currentGameState); updateUI(); return true; }
    function executePivot(vampire, newFacing) { if (!vampire || !DIRECTIONS.includes(newFacing)) return false; if (currentGameState.currentAP < AP_COST.PIVOT) { addToLog("No AP."); return false; } saveStateToHistory(); vampire.facing = newFacing; currentGameState.currentAP -= AP_COST.PIVOT; addToLog(`${vampire.id} pivoted ${newFacing}. (${currentGameState.currentAP} AP)`); renderBoard(currentGameState); updateUI(); return true; }
    function executeShoot(vampire, isSilverBullet = false) { if (!vampire) return false; const cost = isSilverBullet ? AP_COST.SILVER_BULLET : AP_COST.SHOOT; if (currentGameState.currentAP < cost) { addToLog(`No AP.`); return false; } if (vampire.cursed) { addToLog("Cursed cannot shoot."); return false; } const res = currentGameState.playerResources[vampire.player]; if (isSilverBullet && res.silverBullet <= 0) { addToLog("No SB."); return false; } saveStateToHistory(); const shooterIdx = vampire.player; const shooterCls = currentGameState.players[shooterIdx].class; let currCoord = vampire.coord; let msg = `Shot off board.`; let hit = false; addToLog(`${vampire.id} ${isSilverBullet ? 'fires SB' : 'shoots'} ${vampire.facing}...`); if (isSilverBullet) res.silverBullet--; currentGameState.currentAP -= cost; for (let i = 0; i < 9; i++) { const nextCoord = getAdjacentCoord(currCoord, vampire.facing); if (!nextCoord) { msg = `Shot off board.`; break; } currCoord = nextCoord; const target = findPieceAtCoord(currCoord); if (target) { const tType = target.type; const tPiece = target.piece; if (tType === 'hazard' && (tPiece.type === 'Tombstone' || tPiece.type === 'Dynamite')) { if (tPiece.type === 'Tombstone' && shooterCls === 'Bounty Hunter') { addToLog(`Passes Tombstone.`); continue; } msg = `Blocked by ${tPiece.type}.`; hit = true; if (tPiece.type === 'Dynamite') { msg += ` EXPLODES!`; const idx = currentGameState.board.hazards.findIndex(h => h.coord === currCoord); if (idx > -1) currentGameState.board.hazards.splice(idx, 1); /* TODO: Explosion */ addToLog("Dynamite TBD."); } break; } if (tType === 'vampire') { hit = true; if (isSilverBullet && tPiece.player !== shooterIdx) { msg = `SB HIT & ELIMINATED ${tPiece.id}!`; currentGameState.board.vampires = currentGameState.board.vampires.filter(v => v.id !== tPiece.id); /* TODO: Check elim */ } else if (shooterCls === 'Bounty Hunter' && tPiece.player !== shooterIdx && !tPiece.cursed) { msg = `HIT ${tPiece.id}. CURSED!`; const targetV = findVampireById(tPiece.id); if (targetV) targetV.cursed = true; } else { msg = `Hit ${tPiece.id}.`; } break; } if (tType === 'bloodwell') { hit = true; /* TODO: Check Sheriff protection */ msg = `DESTROYED BW ${tPiece.id}!`; currentGameState.board.bloodwells = currentGameState.board.bloodwells.filter(bw => bw.id !== tPiece.id); /* TODO: Check elim */ break; } if (tType === 'hazard' && (tPiece.type === 'Carcass' || tPiece.type === 'Grave Dust')) { addToLog(`Passes ${tPiece.type}.`); continue; } } } addToLog(msg + ` (${currentGameState.currentAP} AP)`); if (isSilverBullet && !hit) addToLog("SB did not hit target."); renderBoard(currentGameState); updateUI(); /* TODO: Check win/loss */ return true; }
    function executeThrow(vampire, hazardType, targetCoord) { if (!vampire) return false; const cost = hazardType === 'Dynamite' ? AP_COST.THROW_DYNAMITE : AP_COST.THROW_HAZARD; if (currentGameState.currentAP < cost) { addToLog(`No AP.`); return false; } if (vampire.cursed) { addToLog("Cursed cannot throw."); return false; } if (!currentGameState.hazardPool || (currentGameState.hazardPool[hazardType] || 0) <= 0) { addToLog(`No ${hazardType}.`); return false; } const dist = getDistance(vampire.coord, targetCoord); if (dist === 0 || dist > 3) { addToLog(`Bad distance.`); return false; } const targetPiece = findPieceAtCoord(targetCoord); if (targetPiece && !(hazardType === 'Grave Dust' && targetPiece.type === 'vampire')) { addToLog(`Target blocked.`); return false; } /* TODO: Path validation */ saveStateToHistory(); currentGameState.hazardPool[hazardType]--; currentGameState.board.hazards.push({ type: hazardType, coord: targetCoord }); currentGameState.currentAP -= cost; addToLog(`${vampire.id} threw ${hazardType} to ${targetCoord}. (${currentGameState.currentAP} AP)`); if (hazardType === 'Grave Dust' && targetPiece?.type === 'vampire') { const targetV = findVampireById(targetPiece.piece.id); if (targetV && !targetV.cursed) { targetV.cursed = true; addToLog(`${targetV.id} CURSED by GD!`); } } renderBoard(currentGameState); updateUI(); return true; }
    function nextTurn() { if (currentGameState.actionState?.pendingAction) { addToLog("Cancel/complete action first."); return; } saveStateToHistory(); const prevIdx = currentGameState.currentPlayerIndex; const prevPlayer = currentGameState.players[prevIdx]; /* TODO: Swift Justice UI/Logic */ let nextIdx = (prevIdx + 1) % numberOfPlayers; let loopCheck = 0; while (currentGameState.players[nextIdx]?.eliminated && loopCheck < numberOfPlayers) { nextIdx = (nextIdx + 1) % numberOfPlayers; loopCheck++; } const activePlayers = currentGameState.players.filter(p => !p.eliminated); if (activePlayers.length <= 1 && loopCheck >= numberOfPlayers) { console.error("Turn advance failed!"); addToLog("Turn Error!"); undoLastAction(); return; } currentGameState.currentPlayerIndex = nextIdx; if (nextIdx <= prevIdx) currentGameState.turn++; const pIdx = currentGameState.currentPlayerIndex; if (currentGameState.turn === 1) { if (numberOfPlayers === 4) currentGameState.currentAP = [4, 5, 6, 8][pIdx]; else if (numberOfPlayers === 3) currentGameState.currentAP = 6; else if (numberOfPlayers === 2) currentGameState.currentAP = 5; else currentGameState.currentAP = 5; } else currentGameState.currentAP = 5; /* TODO: Blood Brothers */ currentGameState.selectedVampireId = null; currentGameState.actionState = { pendingAction: null, selectedHazardType: null }; clearHighlights(); btnUndo.disabled = true; if (currentGameState.board?.vampires) currentGameState.board.vampires.forEach(v => v.movesThisTurn = 0); renderBoard(currentGameState); updateUI(); const currPlayer = currentGameState.players[currentGameState.currentPlayerIndex]; addToLog(`--- Turn ${currentGameState.turn} - ${currPlayer.name}'s turn (${currPlayer.class}). AP: ${currentGameState.currentAP} ---`); /* TODO: Check Victory */ }

    // --- Event Listener Handlers ---
    function handleBoardClick(event) { const squareEl = event.target.closest('.grid-square'); if (!squareEl) return; const coord = squareEl.dataset.coord; if (!currentGameState?.actionState) return; const pending = currentGameState.actionState.pendingAction; if (pending === 'throw-select-target') { const type = currentGameState.actionState.selectedHazardType; const vamp = findVampireById(currentGameState.selectedVampireId); if (squareEl.classList.contains('valid-target')) executeThrow(vamp, type, coord); else addToLog("Invalid target. Throw cancelled."); currentGameState.actionState = { pendingAction: null, selectedHazardType: null }; clearHighlights(); } else if (pending === 'move-select-target') { const vamp = findVampireById(currentGameState.selectedVampireId); if (vamp && squareEl.classList.contains('valid-target')) executeMove(vamp, coord); else addToLog("Invalid target. Move cancelled."); currentGameState.actionState = { pendingAction: null }; clearHighlights(); } else { handleVampireSelection(event); } }
    function handleVampireSelection(event) { const vampEl = event.target.closest('.vampire'); if (vampEl) { const vampId = vampEl.dataset.id; const ownerIdx = parseInt(vampEl.dataset.player); if (ownerIdx === currentGameState.currentPlayerIndex) { if (currentGameState.selectedVampireId !== vampId) { currentGameState.selectedVampireId = vampId; renderBoard(currentGameState); updateUI(); console.log(`Selected ${vampId}`); } } else { addToLog("Cannot select opponent."); if (currentGameState.selectedVampireId) { currentGameState.selectedVampireId = null; renderBoard(currentGameState); updateUI(); } } } else if (event.target.classList.contains('grid-square')) { if (currentGameState.selectedVampireId && !currentGameState.actionState?.pendingAction) { currentGameState.selectedVampireId = null; renderBoard(currentGameState); updateUI(); clearHighlights(); console.log("Deselected."); } } }

    // --- Functions for Throw Action ---
    function populateHazardPicker() { hazardPickerOptions.innerHTML = ''; if (!currentGameState?.hazardPool || typeof currentGameState.currentAP === 'undefined') { console.error("Cannot populate picker: Invalid state."); addToLog("Error prepping throw."); return; } const pool = currentGameState.hazardPool; const ap = currentGameState.currentAP; const createBtn = (type, icon, cost) => { const btn = document.createElement('button'); btn.dataset.hazardType = type; const count = pool[type] || 0; btn.innerHTML = `<span class="hazard-icon">${icon}</span> ${type} <span class="hazard-cost">(${cost} AP)</span>`; btn.disabled = count <= 0 || ap < cost; btn.title = `${count} available`; hazardPickerOptions.appendChild(btn); }; createBtn('Tombstone', '🪦', AP_COST.THROW_HAZARD); createBtn('Carcass', '💀', AP_COST.THROW_HAZARD); createBtn('Grave Dust', '💩', AP_COST.THROW_HAZARD); createBtn('Dynamite', '💥', AP_COST.THROW_DYNAMITE); }
    function handleHazardSelection(hazardType) { console.log("Selected hazard:", hazardType); const cost = hazardType === 'Dynamite' ? AP_COST.THROW_DYNAMITE : AP_COST.THROW_HAZARD; if (!currentGameState?.hazardPool || !currentGameState.actionState) return; if ((currentGameState.hazardPool[hazardType] || 0) <= 0) { addToLog(`No ${hazardType}.`); return; } if (currentGameState.currentAP < cost) { addToLog(`Not enough AP.`); return; } currentGameState.actionState.pendingAction = 'throw-select-target'; currentGameState.actionState.selectedHazardType = hazardType; popups.hazardPicker.style.display = 'none'; /* Use reference from popups object */ highlightThrowTargets(); addToLog(`Throwing ${hazardType}. Select target.`); }
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

    // --- Initialization ---
    function initializeGame() { console.log("Initializing game..."); gameHistory = []; const layouts = LAYOUT_DATA[numberOfPlayers]; if (!layouts?.length) { alert(`Error: No layouts for ${numberOfPlayers}P!`); showScreen('playerCount'); return; } const layoutIdx = Math.floor(Math.random() * layouts.length); const layout = layouts[layoutIdx]; const layoutName = `${numberOfPlayers}P Layout #${layoutIdx + 1}`; console.log(`Selected ${layoutName}`); currentGameState = { players: playerData.map(p => ({ name: p.name, class: p.class, eliminated: false })), board: { vampires: JSON.parse(JSON.stringify(layout.vampires.map(v => ({...v, cursed: false, movesThisTurn: 0})))), bloodwells: JSON.parse(JSON.stringify(layout.bloodwells)), hazards: JSON.parse(JSON.stringify(layout.hazards)) }, hazardPool: { 'Tombstone': 4 - layout.hazards.filter(h => h.type === 'Tombstone').length, 'Carcass': 4 - layout.hazards.filter(h => h.type === 'Carcass').length, 'Grave Dust': 4 - layout.hazards.filter(h => h.type === 'Grave Dust').length, 'Dynamite': 3 }, playerResources: playerData.map(() => ({ silverBullet: 1, abilitiesUsed: [] })), turn: 1, currentPlayerIndex: 0, currentAP: 0, selectedVampireId: null, actionState: { pendingAction: null, selectedHazardType: null } }; const pIdx = currentGameState.currentPlayerIndex; if (currentGameState.turn === 1) { if (numberOfPlayers === 4) currentGameState.currentAP = [4, 5, 6, 8][pIdx]; else if (numberOfPlayers === 3) currentGameState.currentAP = 6; else if (numberOfPlayers === 2) currentGameState.currentAP = 5; else currentGameState.currentAP = 5; } generateGrid(); renderBoard(currentGameState); const player = currentGameState.players[pIdx]; if (!player) { console.error("Init fail."); return; } const resources = currentGameState.playerResources[pIdx]; updatePlayerInfoPanel(player, currentGameState.turn, currentGameState.currentAP, resources); logList.innerHTML = `<li>Game Started: ${layoutName}</li>`; gameLog.scrollTop = 0; btnUndo.disabled = true; gameBoard.removeEventListener('click', handleBoardClick); gameBoard.addEventListener('click', handleBoardClick); btnUndo.removeEventListener('click', undoLastAction); btnUndo.addEventListener('click', undoLastAction); btnEndTurn.removeEventListener('click', nextTurn); btnEndTurn.addEventListener('click', nextTurn); showScreen('gameplay'); addToLog(`--- Turn ${currentGameState.turn} - ${player.name}'s turn (${player.class}). AP: ${currentGameState.currentAP} ---`); }

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

    btnBack.addEventListener('click', () => {
        // Logic to go back during setup
        // When going back, remove the class the player *being left* had selected (if any)
        // so it's available again for the player we are returning to.
        const classPreviouslySelectedByThisPlayer = playerData[currentPlayerSetupIndex]?.class;
        if (classPreviouslySelectedByThisPlayer) {
            const indexInSelected = selectedClasses.indexOf(classPreviouslySelectedByThisPlayer);
            if (indexInSelected > -1) {
                selectedClasses.splice(indexInSelected, 1); // Make it available again
                console.log("Removed class upon Back:", classPreviouslySelectedByThisPlayer, selectedClasses);
            }
        }


        if (currentPlayerSetupIndex > 0) {
            // Go back to previous player's setup screen
            updatePlayerSetupScreen(currentPlayerSetupIndex - 1);
        } else {
            // Go back to player count selection screen
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
