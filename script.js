document.addEventListener('DOMContentLoaded', () => {
    // --- State Variables ---
    let numberOfPlayers = 0;
    let currentPlayerSetupIndex = 0; // 0-based index for player being set up
    let playerData = []; // Array to hold { name: 'P1', class: null } objects
    let selectedClasses = []; // Keep track of classes chosen so far in setup
    // --- Game State (will be populated in initializeGame) ---
    let currentGameState = {};

    // --- DOM Element References ---
    const screens = {
        playerCount: document.getElementById('screen-player-count'),
        playerSetup: document.getElementById('screen-player-setup'),
        gameplay: document.getElementById('screen-gameplay'),
    };
    const popups = {
       elimination: document.getElementById('popup-elimination'), // For later
       victory: document.getElementById('popup-victory'), // For later
    }

    // Player Count Screen Elements
    const playerCountButtons = screens.playerCount.querySelectorAll('button[data-count]');

    // Player Setup Screen Elements
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

    // Gameplay Screen Elements
    const gameplayScreen = screens.gameplay; // Alias for clarity
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

    // --- Class Data (Hardcoded for now) ---
    const CLASS_DATA = {
        "Sheriff": {
            color: "color-sheriff", // Added for rendering later
            description: "A faction of Vampires enforcing order in a chaotic frontier.",
            abilities: ["Under My Protection (Passive)", "Swift Justice (Passive)", "Order Restored (Active, 1/game)"]
        },
        "Vigilante": {
            color: "color-vigilante",
            description: "A faction of Vampires seeking justice, using teamwork to punish wrongdoers.",
            abilities: ["Side by Side (Passive)", "Blood Brothers (Passive)", "Vengeance is Mine (Active, 1/game)"]
        },
        "Outlaw": {
            color: "color-outlaw",
            description: "A faction of Vampires thriving on chaos, disrupting and escaping with speed.",
            abilities: ["Daring Escape (Passive)", "Hand Cannon (Active, 1/game)", "Rampage (Active, 1/game)"]
        },
        "Bounty Hunter": {
            color: "color-bounty-hunter",
            description: "A faction of Vampires hunting for profit, using precision to eliminate targets.",
            abilities: ["Sharpshooter (Passive)", "Marked Man (Passive)", "Contract Payoff (Active, 1/game)"]
        }
    };

    // --- Helper Functions ---

    // Switches the visible screen
    function showScreen(screenId) {
        Object.values(screens).forEach(screen => screen.classList.remove('active'));
        screens[screenId].classList.add('active');
        console.log(`Showing screen: ${screenId}`);
    }

    // Displays details for a selected class during setup
    function displayClassDetails(className) {
        const data = CLASS_DATA[className];
        if (data) {
            classDetailsName.innerHTML = `<strong>Class:</strong> ${className}`;
            classDetailsDescription.textContent = data.description;
            classDetailsAbilities.innerHTML = ''; // Clear previous abilities
            data.abilities.forEach(ability => {
                const li = document.createElement('li');
                li.textContent = ability;
                classDetailsAbilities.appendChild(li);
            });
            classDetailsContainer.style.display = 'block'; // Show details
        } else {
            // Reset if no class name provided
            classDetailsName.innerHTML = `<strong>Class:</strong> ---`;
            classDetailsDescription.textContent = 'Select a class above to see details.';
            classDetailsAbilities.innerHTML = '<li>---</li>';
        }
    }

    // Updates the player setup screen UI for the correct player
    function updatePlayerSetupScreen(playerIndex) {
        const playerNum = playerIndex + 1;
        currentPlayerSetupIndex = playerIndex; // Update global state tracker

        console.log(`Setting up screen for Player ${playerNum}`);

        // Reset temporary selections for the new player
        // Initialize player data slot if it doesn't exist or reset class
        if (!playerData[playerIndex]) {
             playerData[playerIndex] = { name: `P${playerNum}`, class: null };
        } else {
            playerData[playerIndex].class = null; // Reset class selection when revisiting
        }

        playerNameInput.value = ''; // Clear previous name input
        playerNameInput.placeholder = `P${playerNum} Name (Optional)`;

        // Update titles and labels
        playerSetupTitle.textContent = `Player ${playerNum} Setup`;
        playerNameLabel.textContent = `Player ${playerNum} Name:`;

        // Reset and update class buttons status (selected and enabled/disabled)
        let previouslySelectedButton = classSelectionContainer.querySelector('.selected');
        if (previouslySelectedButton) {
            previouslySelectedButton.classList.remove('selected');
        }
        classButtons.forEach(button => {
            const className = button.dataset.class;
            // Disable button if class was selected by a *previous* player
            if (selectedClasses.includes(className)) {
                button.disabled = true;
                button.style.opacity = '0.5';
            } else {
                button.disabled = false;
                button.style.opacity = '1';
            }
        });

        // Reset class details display
        displayClassDetails(null);

        // Update navigation buttons
        btnBack.style.display = (playerIndex === 0) ? 'none' : 'inline-block'; // Hide Back for P1
        btnNext.textContent = (playerIndex === numberOfPlayers - 1) ? 'Start Game' : 'Next';
    }

    // Generates the 9x9 grid structure in the HTML
    function generateGrid() {
        gameBoard.innerHTML = ''; // Clear existing grid
        for (let r = 1; r <= 9; r++) {
            for (let c = 1; c <= 9; c++) {
                const square = document.createElement('div');
                const colLetter = String.fromCharCode(64 + c); // A=65, B=66 etc.
                const coord = `${colLetter}${r}`;
                square.classList.add('grid-square');
                square.dataset.coord = coord; // Store coordinate like "A1", "I9"
                // square.textContent = coord; // Optional: Display coordinate in square
                gameBoard.appendChild(square);
            }
        }
        console.log("Generated 9x9 grid.");
        // TODO: Add grid click listener(s) here later for selecting squares/pieces
    }

    // Renders pieces on the board based on game state (Placeholder)
    function renderBoard(gameState) {
        console.log("Rendering board state (placeholder)...", gameState);
        // 1. Clear existing pieces from the board
        document.querySelectorAll('.piece').forEach(p => p.remove());

        // 2. TODO: Iterate through gameState.layout.vampires, .bloodwells, .hazards
        // 3. For each piece, create a div element with appropriate classes
        //    (e.g., 'piece', 'vampire', 'color-sheriff', 'cursed' if applicable)
        // 4. Add content (icon/text) or ::before/::after styles for appearance
        // 5. Add facing indicator (e.g., data-facing attribute or a rotated arrow)
        // 6. Append the piece div to the correct .grid-square div based on coordinates

        // --- Example Placeholder Rendering ---
        if (gameState && gameState.layout) {
             // Example: Place first Sheriff vampire if layout exists
             if (gameState.layout.vampires && gameState.layout.vampires.length > 0) {
                  const firstVamp = gameState.layout.vampires[0];
                  const targetSquare = gameBoard.querySelector(`[data-coord="${firstVamp.coord}"]`);
                  if(targetSquare) {
                     const vampElement = document.createElement('div');
                     const playerClass = playerData[firstVamp.player].class; // Get class name
                     const classColor = CLASS_DATA[playerClass]?.color || ''; // Get color class
                     vampElement.classList.add('piece', 'vampire', classColor);
                     vampElement.textContent = '♟'; // Placeholder icon
                     // TODO: Add facing indicator, cursed status etc. based on full game state
                     targetSquare.appendChild(vampElement);
                  }
             }
             // Example: Place first hazard
             if (gameState.layout.hazards && gameState.layout.hazards.length > 0) {
                 const firstHazard = gameState.layout.hazards[0];
                 const targetSquare = gameBoard.querySelector(`[data-coord="${firstHazard.coord}"]`);
                 if (targetSquare) {
                     const hazardElement = document.createElement('div');
                     hazardElement.classList.add('piece', 'hazard');
                     // Add specific hazard type class for styling
                     hazardElement.classList.add(`hazard-${firstHazard.type.toLowerCase().replace(' ','-')}`);
                     // Add icon based on type
                     let icon = '?';
                     if (firstHazard.type === 'Tombstone') icon = '🪦';
                     else if (firstHazard.type === 'Carcass') icon = '💀';
                     else if (firstHazard.type === 'Grave Dust') icon = '💩';
                     else if (firstHazard.type === 'Dynamite') icon = '💥';
                     hazardElement.textContent = icon;
                     targetSquare.appendChild(hazardElement);
                 }
             }
        }
    }

    // Updates the player info panel during gameplay
    function updatePlayerInfoPanel(player, turn, currentAP) {
         console.log(`Updating info panel for ${player.name}, Turn ${turn}, AP: ${currentAP}`);
        const data = CLASS_DATA[player.class];
        if (data) {
            currentClassDetailsName.innerHTML = `<strong>Class:</strong> ${player.class}`;
            currentClassDescription.textContent = data.description;
            currentClassAbilitiesList.innerHTML = ''; // Clear previous abilities
            data.abilities.forEach(ability => {
                const li = document.createElement('li');
                li.textContent = ability;
                // TODO: Add check if ability used (from game state), add click listeners for actives
                currentClassAbilitiesList.appendChild(li);
            });
        }
        // TODO: Update silver bullet status based on game state
        infoSilverBullet.textContent = "Available"; // Placeholder

        statusBarPlayer.textContent = player.name;
        statusBarAP.textContent = currentAP; // Use provided AP
        statusBarTurn.textContent = turn;

        // TODO: Enable/disable action buttons based on AP, selection, etc.
    }

    // Adds a message to the game log panel
    function addToLog(message) {
        const li = document.createElement('li');
        // Optional: Add timestamp?
        // const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        // li.textContent = `[${time}] ${message}`;
        li.textContent = message;
        logList.appendChild(li);
        // Auto-scroll to bottom
        gameLog.scrollTop = gameLog.scrollHeight;
        console.log("Log:", message);
    }

     // Main function to set up and start the actual game
     function initializeGame() {
        console.log("Initializing game...");
        console.log("Final Player Data:", playerData);

        // --- TODO: Replace with actual game state setup ---
        // 1. Select Layout: Randomly select a layout based on numberOfPlayers
        //    (Need layout data structure containing multiple layouts per player count)
         const initialLayout = { // Using Layout R1 as placeholder
             vampires: [
                 { player: 0, coord: 'A2', facing: 'S', id: 'S1', cursed: false }, { player: 0, coord: 'C3', facing: 'S', id: 'S2', cursed: false },
                 { player: 1, coord: 'G2', facing: 'S', id: 'V1', cursed: false }, { player: 1, coord: 'I3', facing: 'S', id: 'V2', cursed: false },
                 { player: 2, coord: 'B8', facing: 'N', id: 'O1', cursed: false }, { player: 2, coord: 'D7', facing: 'N', id: 'O2', cursed: false },
                 { player: 3, coord: 'F8', facing: 'N', id: 'B1', cursed: false }, { player: 3, coord: 'H7', facing: 'N', id: 'B2', cursed: false }
             ],
             bloodwells: [ // Need to track which player they belong to
                 { player: 0, coord: 'B1', id: 'SBW1' }, { player: 0, coord: 'D2', id: 'SBW2' }, { player: 0, coord: 'A4', id: 'SBW3' },
                 { player: 1, coord: 'H1', id: 'VBW1' }, { player: 1, coord: 'F2', id: 'VBW2' }, { player: 1, coord: 'I4', id: 'VBW3' },
                 { player: 2, coord: 'C9', id: 'OBW1' }, { player: 2, coord: 'A7', id: 'OBW2' }, { player: 2, coord: 'D9', id: 'OBW3' },
                 { player: 3, coord: 'G9', id: 'BBW1' }, { player: 3, coord: 'I7', id: 'BBW2' }, { player: 3, coord: 'F9', id: 'BBW3' }
             ],
             hazards: [ // Hazards on board
                 { type: 'Tombstone', coord: 'D5' }, { type: 'Tombstone', coord: 'F5' },
                 { type: 'Carcass', coord: 'E4' }, { type: 'Carcass', coord: 'E6' },
                 { type: 'Grave Dust', coord: 'D4' }, { type: 'Grave Dust', coord: 'F6' }
             ]
         };
         // This needs to represent the *entire* state needed to run/undo the game
         currentGameState = {
             players: playerData, // {name, class}
             layout: initialLayout, // Holds pieces currently on board
             hazardPool: { // Hazards available to THROW
                 'Tombstone': 4 - initialLayout.hazards.filter(h => h.type === 'Tombstone').length,
                 'Carcass': 4 - initialLayout.hazards.filter(h => h.type === 'Carcass').length,
                 'Grave Dust': 4 - initialLayout.hazards.filter(h => h.type === 'Grave Dust').length,
                 'Dynamite': 3 // Starts at full count
             },
             playerResources: playerData.map(() => ({ // Per-player resources
                 silverBullet: 1,
                 abilitiesUsed: [] // Track used 'once per game' active abilities
             })),
             turn: 1,
             currentPlayerIndex: 0,
             currentAP: 0, // Will be set below based on turn/player count
             selectedVampireId: null,
             history: [], // For Undo functionality
             // Add player elimination status etc.
         };

         // Set initial AP based on rules
         if (currentGameState.turn === 1) {
             if (numberOfPlayers === 2) currentGameState.currentAP = 5; // P1 in 2P game
             else if (numberOfPlayers === 3) currentGameState.currentAP = 6; // P1 in 3P game
             else if (numberOfPlayers === 4) currentGameState.currentAP = 4; // P1 in 4P game (using corrected 4/5/6/8)
         } else {
             currentGameState.currentAP = 5; // Standard AP
         }
        // -------------------------------------------------

        generateGrid(); // Create the grid squares
        renderBoard(currentGameState); // Render initial pieces based on chosen layout
        updatePlayerInfoPanel(playerData[currentGameState.currentPlayerIndex], currentGameState.turn, currentGameState.currentAP); // Update for P1
        logList.innerHTML = '<li>Game Started...</li>'; // Reset log
        gameLog.scrollTop = 0;
        btnUndo.disabled = true; // Can't undo at start of turn

        // TODO: Add Gameplay Event Listeners
        // - Action Bar buttons (#action-shoot, #action-throw, etc.)
        // - Grid squares/pieces (event delegation on #game-board)
        // - #btn-undo, #btn-end-turn

        showScreen('gameplay');
        addToLog(`Game started with ${numberOfPlayers} players. Player 1 (${playerData[0].name})'s turn.`);
    }


    // --- Event Listeners ---

    // Player Count Selection
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

    // Class Selection Buttons
    classButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (button.disabled) return;

            let currentlySelected = classSelectionContainer.querySelector('.selected');
            if (currentlySelected) {
                currentlySelected.classList.remove('selected');
            }

            button.classList.add('selected');
            const selectedClass = button.dataset.class;
            if (playerData[currentPlayerSetupIndex]) {
                 playerData[currentPlayerSetupIndex].class = selectedClass;
            }
            console.log(`Player ${currentPlayerSetupIndex + 1} selected class: ${selectedClass}`);
            displayClassDetails(selectedClass);
        });
    });

     // Player Name Input (update state on change)
     playerNameInput.addEventListener('input', () => {
         if(playerData[currentPlayerSetupIndex]){
             // Use placeholder if input is empty, otherwise use input value
            playerData[currentPlayerSetupIndex].name = playerNameInput.value.trim() || `P${currentPlayerSetupIndex + 1}`;
            console.log(`Player ${currentPlayerSetupIndex + 1} name set to: ${playerData[currentPlayerSetupIndex].name}`);
         }
     });


    // Back Button (Player Setup)
    btnBack.addEventListener('click', () => {
        console.log("Back button clicked");
        // Remove the class selected by the *current* player from the list before going back
         const currentClassSelection = playerData[currentPlayerSetupIndex]?.class; // Use optional chaining
         if(currentClassSelection) {
             const classIndex = selectedClasses.indexOf(currentClassSelection);
             if (classIndex > -1) {
                 selectedClasses.splice(classIndex, 1);
                 console.log("Removed class from selected list:", currentClassSelection, selectedClasses);
             }
         }

        if (currentPlayerSetupIndex > 0) {
            // Go back to previous player's setup
            updatePlayerSetupScreen(currentPlayerSetupIndex - 1);
        } else {
            // Go back to player count selection
             selectedClasses = [];
             playerData = [];
            showScreen('playerCount');
        }
    });

    // Next / Start Game Button
    btnNext.addEventListener('click', () => {
        console.log("Next/Start Game button clicked");
        const currentPlayerData = playerData[currentPlayerSetupIndex];

        if (!currentPlayerData) {
             console.error("Error: Player data not initialized for index", currentPlayerSetupIndex);
             return; // Should not happen if logic is correct
        }

        // Validate: Class must be selected
        if (!currentPlayerData.class) {
            alert(`Please select a class for Player ${currentPlayerSetupIndex + 1}!`);
            return;
        }

         // Ensure name is set (even if default)
         if (!currentPlayerData.name) {
             currentPlayerData.name = playerNameInput.placeholder || `P${currentPlayerSetupIndex + 1}`;
         }

        // Add selected class to the list to prevent reuse by others
        if (!selectedClasses.includes(currentPlayerData.class)) {
             selectedClasses.push(currentPlayerData.class);
             console.log("Added class to selected list:", currentPlayerData.class, selectedClasses);
        }

        // Check if more players need setup
        if (currentPlayerSetupIndex < numberOfPlayers - 1) {
            updatePlayerSetupScreen(currentPlayerSetupIndex + 1);
        } else {
             initializeGame();
        }
    });

     // Game Log Toggle
    btnToggleLog.addEventListener('click', () => {
        gameLog.classList.toggle('log-hidden');
    });

    // Temporary Back button from Gameplay screen
    btnBackToSetup.addEventListener('click', () => {
        // NOTE: This currently loses all game progress!
        // Reset state variables
         numberOfPlayers = 0;
         currentPlayerSetupIndex = 0;
         playerData = [];
         selectedClasses = [];
         currentGameState = {}; // Clear game state
         console.log("Returning to setup - game state cleared.");
         showScreen('playerCount');
     });


    // --- Initial Setup ---
    showScreen('playerCount'); // Start with the player count screen

}); // End DOMContentLoaded
