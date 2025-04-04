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
    const classDetailsName = document.getElementById('class-name');
    const classDetailsDescription = document.getElementById('class-description');
    const classDetailsAbilities = document.getElementById('class-abilities');
    const classDetailsContainer = document.getElementById('class-details-container');
    const btnBack = document.getElementById('btn-back');
    const btnNext = document.getElementById('btn-next');
    // (Gameplay Elements)
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
    const btnBackToSetup = document.getElementById('btn-back-to-setup'); // Temp button

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

    // --- Helper Functions ---

    // Switches the visible screen
    function showScreen(screenId) {
        Object.values(screens).forEach(screen => screen.classList.remove('active'));
        if (screens[screenId]) {
            screens[screenId].classList.add('active');
        }
        console.log(`Showing screen: ${screenId}`);
    }

    // Displays details (including narrative ability descriptions) for setup
    function displayClassDetails(className) {
        const data = CLASS_DATA[className];
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
            playerData[playerIndex].class = null;
        }
        playerNameInput.value = playerData[playerIndex].name !== `P${playerNum}` ? playerData[playerIndex].name : ''; // Show saved name or empty
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

        displayClassDetails(null);

        btnBack.style.display = (playerIndex === 0) ? 'none' : 'inline-block';
        btnNext.textContent = (playerIndex === numberOfPlayers - 1) ? 'Start Game' : 'Next';
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

    // Renders pieces on the board based on game state
    function renderBoard(gameState) {
        console.log("Rendering board state...");
        // 1. Clear existing pieces (Vampires, Bloodwells, Hazards)
        document.querySelectorAll('.piece').forEach(p => p.remove());

        if (!gameState || !gameState.board) {
            console.error("Cannot render board: Invalid game state provided.");
            return;
        }

        // 2. Render Vampires
        gameState.board.vampires?.forEach(vamp => {
            const targetSquare = gameBoard.querySelector(`[data-coord="${vamp.coord}"]`);
            if (targetSquare) {
                const vampElement = document.createElement('div');
                const playerClass = gameState.players[vamp.player]?.class;
                const classColor = CLASS_DATA[playerClass]?.color || '';
                vampElement.classList.add('piece', 'vampire', classColor);
                vampElement.dataset.id = vamp.id;
                vampElement.dataset.player = vamp.player;
                vampElement.dataset.facing = vamp.facing;

                let arrow = ''; // Use CSS ::before for arrows now
                // if (vamp.facing === 'N') arrow = '↑';
                // else if (vamp.facing === 'S') arrow = '↓';
                // else if (vamp.facing === 'E') arrow = '→';
                // else if (vamp.facing === 'W') arrow = '←';
                // vampElement.textContent = arrow; // Removed text content

                if (vamp.id === gameState.selectedVampireId) {
                    vampElement.classList.add('selected');
                }
                if (vamp.cursed) {
                    vampElement.classList.add('cursed');
                }
                targetSquare.appendChild(vampElement);
            } else {
                console.warn(`Square not found for vampire ${vamp.id} at ${vamp.coord}`);
            }
        });

        // 3. Render Bloodwells
        gameState.board.bloodwells?.forEach(bw => {
            const targetSquare = gameBoard.querySelector(`[data-coord="${bw.coord}"]`);
            if (targetSquare) {
                const bwElement = document.createElement('div');
                const playerClass = gameState.players[bw.player]?.class;
                const classColor = CLASS_DATA[playerClass]?.color || '';
                bwElement.classList.add('piece', 'bloodwell', classColor);
                bwElement.dataset.id = bw.id;
                bwElement.dataset.player = bw.player;
                bwElement.textContent = '🩸';
                targetSquare.appendChild(bwElement);
            } else {
                 console.warn(`Square not found for bloodwell ${bw.id} at ${bw.coord}`);
            }
        });

        // 4. Render Hazards
        gameState.board.hazards?.forEach(hazard => {
            const targetSquare = gameBoard.querySelector(`[data-coord="${hazard.coord}"]`);
            if (targetSquare) {
                const hazardElement = document.createElement('div');
                hazardElement.classList.add('piece', 'hazard');
                const typeClass = `hazard-${hazard.type.toLowerCase().replace(' ','-')}`;
                hazardElement.classList.add(typeClass);

                let icon = '?';
                if (hazard.type === 'Tombstone') icon = '🪦';
                else if (hazard.type === 'Carcass') icon = '💀';
                else if (hazard.type === 'Grave Dust') icon = '💩';
                else if (hazard.type === 'Dynamite') icon = '💥';
                hazardElement.textContent = icon;
                targetSquare.appendChild(hazardElement);
            } else {
                 console.warn(`Square not found for hazard at ${hazard.coord}`);
            }
        });
    }

    // Updates the player info panel during gameplay
    function updatePlayerInfoPanel(player, turn, currentAP, resources) {
        if (!player || !resources) {
             console.error("Cannot update info panel: Invalid player or resource data.");
             // Display default state?
             statusBarPlayer.textContent = 'Error';
             statusBarAP.textContent = '??';
             statusBarTurn.textContent = '??';
             currentClassDetailsName.innerHTML = `<strong>Class:</strong> Error`;
             currentClassDescription.textContent = 'Could not load player data.';
             currentClassAbilitiesList.innerHTML = '';
             infoSilverBullet.textContent = "Unknown";
             return;
        }
         console.log(`Updating info panel for ${player.name}, Turn ${turn}, AP: ${currentAP}`);
        const data = CLASS_DATA[player.class];
        if (data) {
            currentClassDetailsName.innerHTML = `<strong>Class:</strong> ${player.class}`;
            currentClassDescription.textContent = data.description;
            currentClassAbilitiesList.innerHTML = ''; // Clear previous abilities
            data.abilities.forEach(ability => {
                const li = document.createElement('li');
                const isUsed = resources.abilitiesUsed.includes(ability.name);
                li.innerHTML = `<strong>${ability.name}:</strong> ${ability.description}`;
                if (isUsed) {
                    li.style.opacity = '0.5';
                    li.style.textDecoration = 'line-through';
                }
                currentClassAbilitiesList.appendChild(li);
            });
        }
        infoSilverBullet.textContent = resources.silverBullet > 0 ? `Available (${resources.silverBullet})` : "Used";

        statusBarPlayer.textContent = player.name;
        statusBarAP.textContent = currentAP;
        statusBarTurn.textContent = turn;

        // Update Action Button States (Example logic)
        const canAffordShoot = currentAP >= 3;
        const canAffordThrow = currentAP >= 1; // Dynamite costs 2, but check happens later
        const canAffordSilver = currentAP >= 3 && resources.silverBullet > 0;
        const isVampSelected = !!currentGameState.selectedVampireId; // Check if truthy

        document.getElementById('action-shoot').disabled = !isVampSelected || !canAffordShoot;
        document.getElementById('action-throw').disabled = !isVampSelected || !canAffordThrow;
        document.getElementById('action-silver-bullet').disabled = !isVampSelected || !canAffordSilver;
        // TODO: Enable/disable other action buttons (Dispel, Class abilities) based on game state
    }

    // Adds a message to the game log panel
    function addToLog(message) {
        const li = document.createElement('li');
        li.textContent = message;
        // Keep only a certain number of log entries?
        while (logList.children.length > 50) { // Keep last 50 entries
             logList.removeChild(logList.firstChild);
        }
        logList.appendChild(li);
        gameLog.scrollTop = gameLog.scrollHeight;
        console.log("Log:", message);
    }

    // --- Game Logic Functions (Placeholders/Core) ---

    // Saves a deep copy of the current state to history
    function saveStateToHistory() {
        try {
            gameHistory.push(JSON.parse(JSON.stringify(currentGameState)));
            // Limit history size? e.g., gameHistory = gameHistory.slice(-10);
            btnUndo.disabled = false; // Enable undo
            console.log("State saved. History length:", gameHistory.length);
        } catch (error) {
            console.error("Error saving game state:", error);
            // Handle potential circular references or unserializable data if state becomes complex
        }
    }

    // Restores the previous game state from history
    function undoLastAction() {
        if (gameHistory.length > 0) {
            console.log("Undoing last action...");
            try {
                currentGameState = JSON.parse(JSON.stringify(gameHistory.pop()));

                // Re-render everything based on the restored state
                renderBoard(currentGameState);
                const currentPlayer = currentGameState.players[currentGameState.currentPlayerIndex];
                const currentResources = currentGameState.playerResources[currentGameState.currentPlayerIndex];
                 if (!currentPlayer) { // Safety check if player data is missing in undone state
                     console.error("Player data missing in undone state for index", currentGameState.currentPlayerIndex);
                     return;
                 }
                 updatePlayerInfoPanel(currentPlayer, currentGameState.turn, currentGameState.currentAP, currentResources);
                addToLog("--- Last Action Undone ---");

                // Disable undo if history is now empty
                btnUndo.disabled = gameHistory.length === 0;
            } catch (error) {
                console.error("Error restoring game state:", error);
            }
        } else {
            console.log("No actions in history to undo.");
            btnUndo.disabled = true;
        }
    }

    // Handles clicks on the game board (for selecting/deselecting vampires)
    function handleBoardClick(event) {
        const clickedSquare = event.target.closest('.grid-square');
        if (!clickedSquare) return; // Click wasn't inside a square

        const clickedVampireElement = event.target.closest('.vampire');

        if (clickedVampireElement) {
            // Clicked on a vampire piece
            const vampireId = clickedVampireElement.dataset.id;
            const ownerIndex = parseInt(clickedVampireElement.dataset.player);

            if (ownerIndex === currentGameState.currentPlayerIndex) {
                // Clicked own vampire - select it
                if (currentGameState.selectedVampireId !== vampireId) {
                    console.log(`Selected vampire ${vampireId}`);
                    currentGameState.selectedVampireId = vampireId;
                    // Re-render needed to update selection visual & button states
                    renderBoard(currentGameState);
                    const currentPlayer = currentGameState.players[currentGameState.currentPlayerIndex];
                    const currentResources = currentGameState.playerResources[currentGameState.currentPlayerIndex];
                    updatePlayerInfoPanel(currentPlayer, currentGameState.turn, currentGameState.currentAP, currentResources);
                }
                // If already selected, do nothing (or maybe cycle selection if needed later)

            } else {
                // Clicked opponent's vampire - show message, deselect maybe?
                addToLog("Cannot select opponent's vampire.");
                // Deselect if one was selected?
                 if (currentGameState.selectedVampireId) {
                     currentGameState.selectedVampireId = null;
                     renderBoard(currentGameState);
                      const currentPlayer = currentGameState.players[currentGameState.currentPlayerIndex];
                     const currentResources = currentGameState.playerResources[currentGameState.currentPlayerIndex];
                     updatePlayerInfoPanel(currentPlayer, currentGameState.turn, currentGameState.currentAP, currentResources);
                 }
            }
        } else {
            // Clicked on an empty square (or hazard/BW) - deselect current vampire
            if (currentGameState.selectedVampireId) {
                console.log("Deselecting vampire.");
                currentGameState.selectedVampireId = null;
                renderBoard(currentGameState); // Re-render to remove highlight
                const currentPlayer = currentGameState.players[currentGameState.currentPlayerIndex];
                const currentResources = currentGameState.playerResources[currentGameState.currentPlayerIndex];
                updatePlayerInfoPanel(currentPlayer, currentGameState.turn, currentGameState.currentAP, currentResources);
            }
            // TODO: Handle targeting clicks after an action (like Throw) is selected
        }
    }

    // --- Initialization ---
    // Main function to set up and start the actual game
    function initializeGame() {
        console.log("Initializing game...");
        console.log("Final Player Data:", playerData);
        gameHistory = []; // Clear history for new game

        // 1. Select Layout
        const layoutsForPlayerCount = LAYOUT_DATA[numberOfPlayers];
        if (!layoutsForPlayerCount || layoutsForPlayerCount.length === 0) {
            alert(`Error: No layouts defined for ${numberOfPlayers} players! Using default.`);
             // Provide a fallback or stop? For now, log error and maybe use a default 4P.
             console.error(`No layouts found for ${numberOfPlayers} players!`);
             showScreen('playerCount'); // Go back to setup
             return;
        }
        const layoutIndex = Math.floor(Math.random() * layoutsForPlayerCount.length);
        const selectedLayout = layoutsForPlayerCount[layoutIndex];
        addToLog(`Selected Layout: ${numberOfPlayers}P Layout #${layoutIndex + 1}`);

        // 2. Set up initial game state structure
        currentGameState = {
            players: playerData.map(p => ({ name: p.name, class: p.class, eliminated: false })),
            board: {
                 vampires: JSON.parse(JSON.stringify(selectedLayout.vampires.map(v => ({...v, cursed: false})))),
                 bloodwells: JSON.parse(JSON.stringify(selectedLayout.bloodwells)),
                 hazards: JSON.parse(JSON.stringify(selectedLayout.hazards))
            },
            hazardPool: {
                 'Tombstone': 4 - selectedLayout.hazards.filter(h => h.type === 'Tombstone').length,
                 'Carcass': 4 - selectedLayout.hazards.filter(h => h.type === 'Carcass').length,
                 'Grave Dust': 4 - selectedLayout.hazards.filter(h => h.type === 'Grave Dust').length,
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
            // History managed separately by saveStateToHistory
        };

        // 3. Set Initial AP
        const playerIndex = currentGameState.currentPlayerIndex;
         if (currentGameState.turn === 1) {
             if (numberOfPlayers === 4) currentGameState.currentAP = [4, 5, 6, 8][playerIndex];
             else if (numberOfPlayers === 3) currentGameState.currentAP = 6; // Rule was 6AP per player for 3P
             else if (numberOfPlayers === 2) currentGameState.currentAP = 5; // Rule was 5AP per player for 2P
         } else {
             currentGameState.currentAP = 5; // Standard AP after turn 1
         }

        // 4. Initial Render & UI Update
        generateGrid();
        renderBoard(currentGameState);
        const currentPlayer = currentGameState.players[currentGameState.currentPlayerIndex];
        if (!currentPlayer) { // Safety check
            console.error("Error: Could not get current player data during initialization.");
            return;
        }
        const currentResources = currentGameState.playerResources[currentGameState.currentPlayerIndex];
        updatePlayerInfoPanel(currentPlayer, currentGameState.turn, currentGameState.currentAP, currentResources);

        logList.innerHTML = `<li>Game Started with Layout ${numberOfPlayers}P Layout #${layoutIndex + 1}</li>`;
        gameLog.scrollTop = 0;
        btnUndo.disabled = true;

        // 5. Add Gameplay Event Listeners
        gameBoard.removeEventListener('click', handleBoardClick); // Remove old listener if any
        gameBoard.addEventListener('click', handleBoardClick);
        btnUndo.removeEventListener('click', undoLastAction); // Remove old listener if any
        btnUndo.addEventListener('click', undoLastAction);
        // TODO: Add listeners for Action Bar buttons (#action-shoot, etc.)
        // TODO: Add listener for #btn-end-turn

        // 6. Show Gameplay Screen
        showScreen('gameplay');
        addToLog(`Turn ${currentGameState.turn} - ${currentPlayer.name}'s turn (${currentPlayer.class}). AP: ${currentGameState.currentAP}`);
    }


    // --- Event Listeners --- (Setup listeners remain the same)
    playerCountButtons.forEach(button => {
        button.addEventListener('click', () => {
            numberOfPlayers = parseInt(button.dataset.count);
            playerData = new Array(numberOfPlayers);
            selectedClasses = [];
            console.log(`Number of players selected: ${numberOfPlayers}`);
            updatePlayerSetupScreen(0);
            showScreen('playerSetup');
        });
    });
    classButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (button.disabled) return;
            let currentlySelected = classSelectionContainer.querySelector('.selected');
            if (currentlySelected) currentlySelected.classList.remove('selected');
            button.classList.add('selected');
            const selectedClass = button.dataset.class;
            if (playerData[currentPlayerSetupIndex]) playerData[currentPlayerSetupIndex].class = selectedClass;
            console.log(`Player ${currentPlayerSetupIndex + 1} selected class: ${selectedClass}`);
            displayClassDetails(selectedClass);
        });
    });
    playerNameInput.addEventListener('input', () => {
         if(playerData[currentPlayerSetupIndex]){
            playerData[currentPlayerSetupIndex].name = playerNameInput.value.trim() || `P${currentPlayerSetupIndex + 1}`;
            console.log(`Player ${currentPlayerSetupIndex + 1} name set to: ${playerData[currentPlayerSetupIndex].name}`);
         }
     });
    btnBack.addEventListener('click', () => {
         const currentClassSelection = playerData[currentPlayerSetupIndex]?.class;
         if(currentClassSelection) {
             const classIndex = selectedClasses.indexOf(currentClassSelection);
             if (classIndex > -1) selectedClasses.splice(classIndex, 1);
         }
        if (currentPlayerSetupIndex > 0) {
            updatePlayerSetupScreen(currentPlayerSetupIndex - 1);
        } else {
             selectedClasses = [];
             playerData = [];
            showScreen('playerCount');
        }
    });
    btnNext.addEventListener('click', () => {
        const currentPlayerData = playerData[currentPlayerSetupIndex];
        if (!currentPlayerData || !currentPlayerData.class) {
            alert(`Please select a class for Player ${currentPlayerSetupIndex + 1}!`);
            return;
        }
        if (!currentPlayerData.name) currentPlayerData.name = `P${currentPlayerSetupIndex + 1}`;
        if (!selectedClasses.includes(currentPlayerData.class)) selectedClasses.push(currentPlayerData.class);
        if (currentPlayerSetupIndex < numberOfPlayers - 1) {
            updatePlayerSetupScreen(currentPlayerSetupIndex + 1);
        } else {
             initializeGame();
        }
    });
    btnToggleLog.addEventListener('click', () => { gameLog.classList.toggle('log-hidden'); });
    btnBackToSetup.addEventListener('click', () => {
         numberOfPlayers = 0; currentPlayerSetupIndex = 0; playerData = []; selectedClasses = []; currentGameState = {}; gameHistory = [];
         console.log("Returning to setup - game state cleared.");
         showScreen('playerCount');
     });

    // --- Initial Setup ---
    showScreen('playerCount'); // Start with the player count screen

}); // End DOMContentLoaded
