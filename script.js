document.addEventListener('DOMContentLoaded', () => {
    // --- State Variables ---
    let numberOfPlayers = 0;
    let currentPlayerSetupIndex = 0;
    let playerData = [];
    let selectedClasses = [];
    let currentGameState = {};
    let gameHistory = []; // For Undo

    // --- Constants ---
    const AP_COST = {
        MOVE: 1,
        PIVOT: 1,
        SHOOT: 3,
        SILVER_BULLET: 3,
        THROW_HAZARD: 1,
        THROW_DYNAMITE: 2,
        // Add other action costs
    };
    const DIRECTIONS = ['N', 'E', 'S', 'W'];

    // --- DOM Element References ---
    // (Screens, Popups, Setup Elements)
    const screens = { /* ... (same as before) ... */ };
    const popups = { /* ... (same as before) ... */ };
    // (Setup Elements)
    const playerCountButtons = screens.playerCount.querySelectorAll('button[data-count]');
    const playerSetupTitle = document.getElementById('player-setup-title');
    // ... (rest of setup elements same as before) ...
    const classSelectionContainer = document.getElementById('class-selection-buttons');
    const classButtons = classSelectionContainer.querySelectorAll('.btn-class');
    const classDetailsName = document.getElementById('class-name'); // Setup details
    const classDetailsDescription = document.getElementById('class-description'); // Setup details
    const classDetailsAbilities = document.getElementById('class-abilities'); // Setup details
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


    // --- Class Data & Layout Data ---
    const CLASS_DATA = { /* ... (Full data with narrative descriptions from previous step) ... */ };
    const LAYOUT_DATA = { /* ... (Layout examples from previous step) ... */ };


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

    // Calculates distance between two coords (simple grid distance)
    function getDistance(coord1, coord2) {
        const rc1 = getRowColFromCoord(coord1);
        const rc2 = getRowColFromCoord(coord2);
        if (!rc1 || !rc2) return Infinity;
        return Math.abs(rc1.row - rc2.row) + Math.abs(rc1.col - rc2.col);
    }

    // --- Helper Functions --- (showScreen, displayClassDetails (setup), updatePlayerSetupScreen - same as before)
    function showScreen(screenId) { /* ... */ }
    function displayClassDetails(className) { /* ... (Uses CLASS_DATA with narrative descriptions) ... */ }
    function updatePlayerSetupScreen(playerIndex) { /* ... */ }
    function addToLog(message) { /* ... */ }
    function generateGrid() { /* ... */ }
    function getPlayerColorClass(playerIndex) { /* ... */ }

    // --- Board Rendering ---
    function renderBoard(gameState) {
         // console.log("Rendering board state..."); // Reduce console noise
        document.querySelectorAll('.piece').forEach(p => p.remove()); // Clear existing pieces

        if (!gameState || !gameState.board) { console.error("Render Error: Invalid state."); return; }

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
            }
        });
    }

    // Updates the player info panel during gameplay
    function updatePlayerInfoPanel(player, turn, currentAP, resources) {
        // ... (same as before, including disabling action buttons based on AP/Selection) ...
        if (!player || !resources) { console.error("Info Panel Error: Invalid data."); return; }
        const data = CLASS_DATA[player.class];
        // ... (Update name, description, abilities list with used status) ...
        infoSilverBullet.textContent = resources.silverBullet > 0 ? `Available (${resources.silverBullet})` : "Used";
        statusBarPlayer.textContent = player.name;
        statusBarAP.textContent = currentAP;
        statusBarTurn.textContent = turn;

        const canAffordShoot = currentAP >= AP_COST.SHOOT;
        const canAffordThrow = currentAP >= AP_COST.THROW_HAZARD; // Base cost
        const canAffordSilver = currentAP >= AP_COST.SILVER_BULLET && resources.silverBullet > 0;
        const isVampSelected = !!currentGameState.selectedVampireId;
        const selectedVamp = findVampireById(currentGameState.selectedVampireId);
        const isCursed = selectedVamp?.cursed;

        btnShoot.disabled = !isVampSelected || !canAffordShoot || isCursed; // Cursed cannot shoot
        btnThrow.disabled = !isVampSelected || !canAffordThrow || isCursed; // Cursed cannot throw
        btnSilverBullet.disabled = !isVampSelected || !canAffordSilver || isCursed; // Cursed cannot shoot
    }


    // --- Game State & Undo Logic ---
    function saveStateToHistory() { /* ... (same as before) ... */ }
    function undoLastAction() { /* ... (same as before) ... */ }

    // --- Find Pieces in Game State ---
    function findVampireById(vampId) {
        return currentGameState.board.vampires.find(v => v.id === vampId);
    }
    function findPieceAtCoord(coord) {
        // Check for vampire first (higher z-index visually)
        const vamp = currentGameState.board.vampires.find(v => v.coord === coord);
        if (vamp) return { type: 'vampire', piece: vamp };
        const bw = currentGameState.board.bloodwells.find(b => b.coord === coord);
        if (bw) return { type: 'bloodwell', piece: bw };
        const hazard = currentGameState.board.hazards.find(h => h.coord === coord);
        if (hazard) return { type: 'hazard', piece: hazard };
        return null; // Empty square
    }


    // --- Action Execution Functions ---

    function executeMove(vampire, targetCoord) {
        saveStateToHistory(); // Save state *before* the move

        // Check validity (basic checks here, more needed for rules)
        if (currentGameState.currentAP < AP_COST.MOVE) { addToLog("Not enough AP to Move."); return; }
        if (vampire.cursed) { addToLog("Cursed vampires have limited movement (handled differently)."); return; } // Separate logic potentially needed

        const pieceAtTarget = findPieceAtCoord(targetCoord);
        if (pieceAtTarget && (pieceAtTarget.type === 'vampire' || pieceAtTarget.type === 'bloodwell' || (pieceAtTarget.type === 'hazard' && pieceAtTarget.piece.type === 'Carcass'))) {
             addToLog(`Cannot move onto square ${targetCoord} occupied by ${pieceAtTarget.piece.type}.`);
             return;
        }
        // TODO: Add check for moving only 1 square in facing direction rule

        // Update state
        vampire.coord = targetCoord;
        currentGameState.currentAP -= AP_COST.MOVE;
        addToLog(`${vampire.id} moved to ${targetCoord}. (${currentGameState.currentAP} AP left)`);

        // Check for landing on Grave Dust -> Curse
        if (pieceAtTarget && pieceAtTarget.type === 'hazard' && pieceAtTarget.piece.type === 'Grave Dust') {
            vampire.cursed = true;
            addToLog(`${vampire.id} landed on Grave Dust and is now CURSED!`);
        }
        // TODO: Check for landing on own Bloodwell -> Cure curse

        // Update UI
        renderBoard(currentGameState);
        updateUI();
    }

    function executePivot(vampire, newFacing) {
        saveStateToHistory();
        if (currentGameState.currentAP < AP_COST.PIVOT) { addToLog("Not enough AP to Pivot."); return; }

        vampire.facing = newFacing;
        currentGameState.currentAP -= AP_COST.PIVOT;
        addToLog(`${vampire.id} pivoted to face ${newFacing}. (${currentGameState.currentAP} AP left)`);
        renderBoard(currentGameState);
        updateUI();
    }

    function executeShoot(vampire, isSilverBullet = false) {
        saveStateToHistory();
        const cost = isSilverBullet ? AP_COST.SILVER_BULLET : AP_COST.SHOOT;
        if (currentGameState.currentAP < cost) { addToLog(`Not enough AP for ${isSilverBullet ? 'Silver Bullet' : 'Shoot'}.`); return; }
        if (vampire.cursed) { addToLog("Cursed vampires cannot shoot."); return; }

        const shooterPlayerIndex = vampire.player;
        const shooterClass = currentGameState.players[shooterPlayerIndex].class;
        let currentCoord = vampire.coord;
        let pathBlocked = false;
        let hitMessage = "Shot travelled off the board.";

        addToLog(`${vampire.id} ${isSilverBullet ? 'fires a Silver Bullet' : 'shoots'} facing ${vampire.facing}...`);

        if (isSilverBullet) {
             currentGameState.playerResources[shooterPlayerIndex].silverBullet--;
        }
        currentGameState.currentAP -= cost;

        // Trace path
        for (let i = 0; i < 9; i++) { // Max 9 squares range
            currentCoord = getAdjacentCoord(currentCoord, vampire.facing);
            if (!currentCoord) break; // Off board

            const pieceAtCoord = findPieceAtCoord(currentCoord);
            if (pieceAtCoord) {
                const targetType = pieceAtCoord.type;
                const targetPiece = pieceAtCoord.piece;

                // Check blocking hazards
                if (targetType === 'hazard' && (targetPiece.type === 'Tombstone' || targetPiece.type === 'Dynamite')) {
                    // Bounty Hunters ignore Tombstones
                     if (targetPiece.type === 'Tombstone' && shooterClass === 'Bounty Hunter') {
                        addToLog(`Shot passes through Tombstone at ${currentCoord} (Sharpshooter).`);
                        continue; // Pass through
                    }
                    // TODO: Check Sheriff protection for Dynamite? (Rules say Dynamite blocks shots)
                    hitMessage = `Shot blocked by ${targetPiece.type} at ${currentCoord}.`;
                    pathBlocked = true;

                     // Check if Dynamite explodes
                    if (targetPiece.type === 'Dynamite') {
                        hitMessage += ` Dynamite EXPLODES!`;
                        // TODO: Implement dynamite explosion logic
                        // - Remove dynamite hazard
                        // - Remove other hazards in 3x3 area
                        // - Destroy bloodwells in 3x3 area
                    }
                    break; // Stop shot
                }

                // Hit Vampire
                if (targetType === 'vampire') {
                     if (isSilverBullet && targetPiece.player !== shooterPlayerIndex) {
                         hitMessage = `Silver Bullet HIT and ELIMINATED enemy ${targetPiece.id} at ${currentCoord}!`;
                         // Remove vampire from board state
                         currentGameState.board.vampires = currentGameState.board.vampires.filter(v => v.id !== targetPiece.id);
                         // TODO: Check elimination conditions for the target player
                     } else if (shooterClass === 'Bounty Hunter' && targetPiece.player !== shooterPlayerIndex && !targetPiece.cursed) {
                         hitMessage = `Shot HIT enemy ${targetPiece.id} at ${currentCoord}. Target is CURSED (Marked Man)!`;
                         targetPiece.cursed = true; // Apply curse
                     } else {
                         hitMessage = `Shot hit ${targetPiece.id} at ${currentCoord} (no effect).`;
                     }
                     pathBlocked = true;
                    break;
                }

                // Hit Bloodwell
                if (targetType === 'bloodwell') {
                    // TODO: Check Sheriff 'Under My Protection'
                     hitMessage = `Shot DESTROYED Bloodwell ${targetPiece.id} at ${currentCoord}!`;
                    // Remove bloodwell
                    currentGameState.board.bloodwells = currentGameState.board.bloodwells.filter(bw => bw.id !== targetPiece.id);
                     // TODO: Check elimination conditions for the target player
                    pathBlocked = true;
                    break;
                }

                 // Ignore Carcass/Grave Dust for blocking shots
                if (targetType === 'hazard' && (targetPiece.type === 'Carcass' || targetPiece.type === 'Grave Dust')) {
                     addToLog(`Shot passes through ${targetPiece.type} at ${currentCoord}.`);
                    continue; // Pass through
                }
            }
        }

        addToLog(hitMessage + ` (${currentGameState.currentAP} AP left)`);
        renderBoard(currentGameState);
        updateUI();
        // TODO: Check win/loss conditions after shot resolution
    }

    function executeThrow(vampire, hazardType, targetCoord) {
        saveStateToHistory();
        const cost = hazardType === 'Dynamite' ? AP_COST.THROW_DYNAMITE : AP_COST.THROW_HAZARD;
        if (currentGameState.currentAP < cost) { addToLog(`Not enough AP to Throw ${hazardType}.`); return; }
        if (vampire.cursed) { addToLog("Cursed vampires cannot throw hazards."); return; }
        if (currentGameState.hazardPool[hazardType] <= 0) { addToLog(`No ${hazardType} left in the pool to throw.`); return; }

        // --- TODO: Full Throw Validation ---
        // 1. Check distance <= 3
        // 2. Check clear path (no Vamps, BWs, Carcasses in intermediate squares)
        // 3. Check target square empty (unless Grave Dust targeting a Vampire)
        const distance = getDistance(vampire.coord, targetCoord);
         if(distance > 3) { addToLog(`Target ${targetCoord} is too far to throw (Max 3).`); return; }
        // Basic check - needs path tracing and target occupancy check based on type
        const pieceAtTarget = findPieceAtCoord(targetCoord);
         if(pieceAtTarget && !(hazardType === 'Grave Dust' && pieceAtTarget.type === 'vampire')) {
             addToLog(`Cannot throw onto occupied square ${targetCoord}.`);
             return;
         }
        // --- End Validation Placeholder ---


        // Update state
        currentGameState.hazardPool[hazardType]--; // Decrement pool count
        currentGameState.board.hazards.push({ type: hazardType, coord: targetCoord }); // Add to board
        currentGameState.currentAP -= cost;
        addToLog(`${vampire.id} threw ${hazardType} to ${targetCoord}. (${currentGameState.currentAP} AP left)`);

        // Special case: Grave Dust landing on Vampire
        if (hazardType === 'Grave Dust' && pieceAtTarget && pieceAtTarget.type === 'vampire') {
            const targetVamp = pieceAtTarget.piece;
            if (!targetVamp.cursed) {
                targetVamp.cursed = true;
                addToLog(`${targetVamp.id} was hit by Grave Dust and is now CURSED!`);
            }
        }

        renderBoard(currentGameState);
        updateUI();
    }

     function nextTurn() {
         saveStateToHistory(); // Save state before ending turn

         const previousPlayerIndex = currentGameState.currentPlayerIndex;
         // TODO: Apply end-of-turn effects (e.g., Sheriff Swift Justice)

         // Advance Player Index
         currentGameState.currentPlayerIndex = (previousPlayerIndex + 1) % numberOfPlayers;

         // Skip eliminated players
         while (currentGameState.players[currentGameState.currentPlayerIndex].eliminated) {
             currentGameState.currentPlayerIndex = (currentGameState.currentPlayerIndex + 1) % numberOfPlayers;
             if (currentGameState.currentPlayerIndex === previousPlayerIndex) {
                 // Only one player left - should have been caught by victory condition?
                 console.error("Error: Infinite loop detected in nextTurn - all other players eliminated?");
                 return;
             }
         }

        // Increment turn number if we wrapped around to Player 1 (index 0)
        if (currentGameState.currentPlayerIndex < previousPlayerIndex) {
            currentGameState.turn++;
        }

        // Set AP for the new player
         const playerIndex = currentGameState.currentPlayerIndex;
         if (currentGameState.turn === 1) { // This condition might be redundant if turn increments correctly
             if (numberOfPlayers === 4) currentGameState.currentAP = [4, 5, 6, 8][playerIndex];
             else if (numberOfPlayers === 3) currentGameState.currentAP = 6;
             else if (numberOfPlayers === 2) currentGameState.currentAP = 5;
         } else {
             currentGameState.currentAP = 5; // Standard AP
         }
         // TODO: Add Vigilante Blood Brothers check here to potentially add +1 AP

        // Reset turn-specific state
        currentGameState.selectedVampireId = null;
        currentGameState.actionState = { pendingAction: null, selectedHazardType: null };
         btnUndo.disabled = true; // Disable undo at start of new turn (or allow undoing end turn?) - Disabled for now.
         gameHistory = []; // Clear history on turn end? Or allow multi-turn undo? Clearing for now.

        // Update UI for new player
        renderBoard(currentGameState); // Rerender to remove selection highlights etc.
        const currentPlayer = currentGameState.players[currentGameState.currentPlayerIndex];
        const currentResources = currentGameState.playerResources[currentGameState.currentPlayerIndex];
        updatePlayerInfoPanel(currentPlayer, currentGameState.turn, currentGameState.currentAP, currentResources);
        addToLog(`--- Turn ${currentGameState.turn} - ${currentPlayer.name}'s turn (${currentPlayer.class}). AP: ${currentGameState.currentAP} ---`);
    }

    // Central UI update function
    function updateUI() {
        const currentPlayer = currentGameState.players[currentGameState.currentPlayerIndex];
        const currentResources = currentGameState.playerResources[currentGameState.currentPlayerIndex];
        updatePlayerInfoPanel(currentPlayer, currentGameState.turn, currentGameState.currentAP, currentResources);
        // Note: renderBoard is called separately after state changes that affect the board
    }


    // --- Event Listener Handlers ---

    // Handles clicks on the game board (delegated)
    function handleBoardClick(event) {
        const clickedSquareElement = event.target.closest('.grid-square');
        if (!clickedSquareElement) return;
        const clickedCoord = clickedSquareElement.dataset.coord;

        const pendingAction = currentGameState.actionState.pendingAction;

        if (pendingAction === 'throw-select-target') {
             // Currently trying to select a target for throwing
             const selectedHazardType = currentGameState.actionState.selectedHazardType;
             const selectedVamp = findVampireById(currentGameState.selectedVampireId);
             // TODO: Validate if clickedCoord is a valid target based on rules/highlighting
             // If valid:
             executeThrow(selectedVamp, selectedHazardType, clickedCoord);
             // Reset action state
             currentGameState.actionState = { pendingAction: null, selectedHazardType: null };
             clearHighlights(); // Remove target highlighting
             // Don't deselect vampire after throwing? Optional.
        } else if (pendingAction === 'move-select-target') {
            // TODO: Handle move target selection
             clearHighlights();
        } else if (pendingAction === 'pivot-select-direction') {
            // This case shouldn't happen from board click
             clearHighlights();
        } else {
            // Default behavior: Select/Deselect Vampire
            handleVampireSelection(event);
        }
    }

    // Handles clicks within the board logic (selecting/deselecting)
    function handleVampireSelection(event) { /* ... (same as before) ... */ }

    // Removes target highlighting from the board
    function clearHighlights() {
        document.querySelectorAll('.grid-square.valid-target, .grid-square.invalid-target').forEach(el => {
            el.classList.remove('valid-target', 'invalid-target');
        });
    }

    // --- Initialization ---
    function initializeGame() { /* ... (same as before, sets up state, calls render/updateUI) ... */ }

    // --- Attach Event Listeners ---

    // Setup Screens
    playerCountButtons.forEach(button => { button.addEventListener('click', () => { /* ... */ }); });
    classButtons.forEach(button => { button.addEventListener('click', () => { /* ... */ }); });
    playerNameInput.addEventListener('input', () => { /* ... */ });
    btnBack.addEventListener('click', () => { /* ... */ });
    btnNext.addEventListener('click', () => { /* ... */ });

    // Gameplay Screen
    gameBoard.addEventListener('click', handleBoardClick); // Use delegation
    btnUndo.addEventListener('click', undoLastAction);
    btnEndTurn.addEventListener('click', nextTurn); // End turn button
    btnToggleLog.addEventListener('click', () => { gameLog.classList.toggle('log-hidden'); });
    btnBackToSetup.addEventListener('click', () => { /* ... */ }); // Temp back button

    // Gameplay Action Buttons
    btnShoot.addEventListener('click', () => {
        const selectedVamp = findVampireById(currentGameState.selectedVampireId);
        if (selectedVamp) {
            executeShoot(selectedVamp, false);
        } else { addToLog("Select a Vampire first."); }
    });

    btnSilverBullet.addEventListener('click', () => {
        const selectedVamp = findVampireById(currentGameState.selectedVampireId);
        const playerResources = currentGameState.playerResources[currentGameState.currentPlayerIndex];
        if (selectedVamp && playerResources.silverBullet > 0) {
             if (confirm("Use your only Silver Bullet?")) { // Add confirmation
                 executeShoot(selectedVamp, true);
             }
        } else if (!selectedVamp) { addToLog("Select a Vampire first."); }
        else { addToLog("No Silver Bullet left."); }
    });

    btnThrow.addEventListener('click', () => {
    console.log("--- Throw Button Clicked ---"); // <-- ADD THIS LINE

    const selectedVamp = findVampireById(currentGameState.selectedVampireId);
    if (!selectedVamp) {
        addToLog("Select a Vampire first.");
        console.log("Throw aborted: No vampire selected."); // <-- ADD THIS LINE
        return;
    }
    if (selectedVamp.cursed) {
        addToLog("Cursed vampires cannot throw hazards.");
         console.log("Throw aborted: Vampire cursed."); // <-- ADD THIS LINE
        return;
    }
    if (currentGameState.currentAP < AP_COST.THROW_HAZARD) {
        addToLog("Not enough AP to throw.");
         console.log("Throw aborted: Not enough AP."); // <-- ADD THIS LINE
        return;
    }

    console.log("Checks passed, proceeding to show picker..."); // <-- ADD THIS LINE
    console.log("Current Game State Before Populate:", currentGameState); // <-- ADD THIS LINE (Check state)

    // Show Hazard Picker
    populateHazardPicker(); // Call the function to create buttons
    console.log("Hazard Picker Popup Element:", hazardPickerPopup); // <-- ADD THIS LINE (Check element)
    hazardPickerPopup.style.display = 'flex'; // Show the picker popup
    console.log("Set hazardPickerPopup display to flex."); // <-- ADD THIS LINE

    currentGameState.actionState.pendingAction = 'throw-select-hazard';
    addToLog("Select a hazard type to throw.");
});

    btnCancelThrow.addEventListener('click', () => {
         hazardPickerPopup.style.display = 'none';
         currentGameState.actionState = { pendingAction: null, selectedHazardType: null };
         clearHighlights();
         addToLog("Throw action cancelled.");
    });

    // Add listeners for dynamically created hazard picker buttons later (or use delegation)
     hazardPickerOptions.addEventListener('click', (event) => {
          const button = event.target.closest('button');
          if (button && button.dataset.hazardType) {
              handleHazardSelection(button.dataset.hazardType);
          }
     });


     // --- Functions for Throw Action ---
function populateHazardPicker() {
    console.log("--- Populating Hazard Picker ---"); // <-- ADD THIS LINE
    hazardPickerOptions.innerHTML = ''; // Clear old options
    const pool = currentGameState.hazardPool;
    const ap = currentGameState.currentAP;

    console.log("Hazard Pool:", pool, "Current AP:", ap); // <-- ADD THIS LINE

    const createButton = (type, icon, cost) => {
        console.log(`Creating button for: ${type}, Pool: ${pool[type]}, Cost: ${cost}, Has AP: ${ap >= cost}`); // <-- ADD THIS LINE
        const button = document.createElement('button');
        button.dataset.hazardType = type;
        button.innerHTML = `<span class="hazard-icon">${icon}</span> <span class="math-inline">\{type\} <span class\="hazard\-cost"\>\(</span>{cost} AP)</span>`;
        button.disabled = pool[type] <= 0 || ap < cost;
        // Add count? button.title = `${pool[type]} available`;
        hazardPickerOptions.appendChild(button);
    };

    createButton('Tombstone', '🪦', AP_COST.THROW_HAZARD);
    createButton('Carcass', '💀', AP_COST.THROW_HAZARD);
    createButton('Grave Dust', '💩', AP_COST.THROW_HAZARD);
    createButton('Dynamite', '💥', AP_COST.THROW_DYNAMITE);
     console.log("Finished populating picker."); // <-- ADD THIS LINE
}

     function handleHazardSelection(hazardType) {
         console.log("Selected hazard:", hazardType);
         const cost = hazardType === 'Dynamite' ? AP_COST.THROW_DYNAMITE : AP_COST.THROW_HAZARD;
         // Double check conditions (should be disabled if invalid, but belt-and-suspenders)
         if (currentGameState.hazardPool[hazardType] <= 0) { addToLog(`No ${hazardType} left.`); return; }
         if (currentGameState.currentAP < cost) { addToLog(`Not enough AP for ${hazardType}.`); return; }

         currentGameState.actionState.pendingAction = 'throw-select-target';
         currentGameState.actionState.selectedHazardType = hazardType;
         hazardPickerPopup.style.display = 'none'; // Hide picker

         // Highlight valid target squares
         highlightThrowTargets();
         addToLog(`Throwing ${hazardType}. Select a target square.`);
     }

     function highlightThrowTargets() {
         clearHighlights();
         const selectedVamp = findVampireById(currentGameState.selectedVampireId);
         if (!selectedVamp) return;

         const startCoord = selectedVamp.coord;
         const startRC = getRowColFromCoord(startCoord);
         const hazardType = currentGameState.actionState.selectedHazardType;

         // Iterate through all squares to check validity
         document.querySelectorAll('.grid-square').forEach(square => {
             const targetCoord = square.dataset.coord;
             const targetRC = getRowColFromCoord(targetCoord);
             const distance = getDistance(startCoord, targetCoord);

             // --- TODO: Implement full validation logic ---
             let isValid = false;
             if (distance > 0 && distance <= 3) {
                  // Basic distance check passed
                  // 1. Check Path: Needs iteration from start to target, checking for blocking pieces (Vamp, BW, Carcass)
                  // 2. Check Target Occupancy:
                  const pieceAtTarget = findPieceAtCoord(targetCoord);
                   if (!pieceAtTarget) {
                        isValid = true; // Empty square is valid
                   } else if (hazardType === 'Grave Dust' && pieceAtTarget.type === 'vampire') {
                        isValid = true; // GD can target Vamps
                   }
             }
             // --- End Validation Placeholder ---

             if (isValid) {
                 square.classList.add('valid-target');
             } else {
                  square.classList.add('invalid-target'); // Optional: visually block invalid ones
             }
         });
     }


    // --- Initial Load ---
    showScreen('playerCount'); // Start with the player count screen

}); // End DOMContentLoaded
