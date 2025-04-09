document.addEventListener("DOMContentLoaded", () => { // FIXED: Correct arrow function syntax
	// --- 1. Top-Level State Variables ---
	let numberOfPlayers = 0;
	let currentPlayerSetupIndex = 0;
	let playerData = []; // Array to hold { name: string, class: string|null } objects
	let selectedClasses = []; // Keep track of classes chosen during setup
	let currentGameState = {}; // Initialized in initializeGame()
	let gameHistory = []; // Stores previous game states for Undo
	let lastActiveScreenId = "playerCount"; // Track screen before opening Help/Popups

	// --- Swift Justice State Flags ---
	let isSwiftJusticeMovePending = false;
	let swiftJusticePlayerIndex = -1;
	let swiftJusticeVampId = null;

	// --- 2. Constants ---
	const AP_COST = {
		MOVE: 1,
		PIVOT: 1,
		SHOOT: 3,
		SILVER_BULLET: 3,
		THROW_HAZARD: 1,
		THROW_DYNAMITE: 2,
		DISPEL: 3,
		BITE_FUSE: 1,
		RAMPAGE: 2,
		HAND_CANNON: 5,
		ORDER_RESTORED: 3,
		CONTRACT_PAYOFF: 3,
		VENGEANCE_IS_MINE: 0,
	};

	const DIRECTIONS = ["N", "E", "S", "W"];

	// Class definitions including abilities and display info
	const CLASS_DATA = {
		Sheriff: {
			color: "color-sheriff",
			description: "A faction of Vampires enforcing order in a chaotic frontier.",
			abilities: [{
					name: "Under My Protection",
					type: "Passive",
					apCost: 0,
					description: "The Sheriff's vigilance shields nearby Bloodwells...",
					techDesc: "Bloodwells in 3x3 grid centered on Sheriff are immune to standard Shots (not Hand Cannon)."
				},
				{
					name: "Swift Justice",
					type: "Passive",
					apCost: 0,
					description: "Fueled by unwavering purpose, one Sheriff presses forward...",
					techDesc: "End of Turn: May move one non-cursed Sheriff 1 square forward (0 AP)."
				},
				{
					name: "Order Restored",
					type: "Active",
					apCost: 3,
					description: "Even true death cannot halt the Sheriff's decree!...",
					techDesc: "1/game: Revive one eliminated Sheriff adjacent to own Vamp/BW."
				},
			],
		},
		Vigilante: {
			color: "color-vigilante",
			description: "A faction of Vampires seeking justice, using teamwork.",
			abilities: [{
					name: "Side by Side",
					type: "Passive",
					apCost: 0,
					description: "Bound by blood and vengeance, this driven pair acts as one...",
					techDesc: "Player's AP pool is shared between both Vampires."
				},
				{
					name: "Blood Brothers",
					type: "Passive",
					apCost: 0,
					description: "Their shared purpose empowers their dark bond when near...",
					techDesc: "Start of Turn: +1 AP if Vamps are within 3x3 grid and both act this turn."
				},
				{
					name: "Vengeance is Mine",
					type: "Active",
					apCost: 0,
					description: "Harm my kin, feel my wrath tenfold!...",
					techDesc: "1/game: After own piece is shot, gain 7 AP next turn."
				},
			],
		},
		Outlaw: {
			color: "color-outlaw",
			description: "A faction of Vampires thriving on chaos, disrupting and escaping.",
			abilities: [{
					name: "Daring Escape",
					type: "Passive",
					apCost: 0,
					description: "Blast an enemy Bloodwell, then melt into the shadows...",
					techDesc: "1/turn: After shooting a Bloodwell, may Pivot free & Move up to 2 squares (0 AP)."
				},
				{
					name: "Hand Cannon",
					type: "Active",
					apCost: 5,
					description: "Unleash unholy hellfire from a modified Hand Cannon!...",
					techDesc: "1/game: Piercing shot (max 5 sq), ignores Hazards (unless Sheriff-prot.). Destroys BW/Hazards hit."
				},
				{
					name: "Rampage",
					type: "Active",
					apCost: 2,
					description: "Embrace the chaos! The Outlaw spins wildly...",
					techDesc: "1/game: Shoot simultaneously Left & Right (two standard shots)."
				},
			],
		},
		"Bounty Hunter": {
			color: "color-bounty-hunter",
			description: "A faction of Vampires hunting for profit, using precision.",
			abilities: [{
					name: "Sharpshooter",
					type: "Passive",
					apCost: 0,
					description: "Tombstones offer no refuge. This Hunter's unnervingly accurate shots...",
					techDesc: "Shots ignore Tombstones when determining hit/block."
				},
				{
					name: "Marked Man",
					type: "Passive",
					apCost: 0,
					description: "Every bullet carries a debilitating hex...",
					techDesc: "Standard shots hitting enemy Vamps apply Curse (Move 1/turn, No Shoot/Throw)."
				},
				{
					name: "Contract Payoff",
					type: "Active",
					apCost: 3,
					description: "Destroying an enemy Bloodwell brings dark satisfaction...",
					techDesc: "1/game: If shot destroys any BW, gain +3 AP (2P) / +5 AP (3P/4P) next turn."
				},
			],
		},
	};

	// --- 3. DOM Element References ---
	// Screens
	const screens = {
		playerCount: document.getElementById("screen-player-count"),
		playerSetup: document.getElementById("screen-player-setup"),
		gameplay: document.getElementById("screen-gameplay"),
		// How-to-play screen is also a popup
	};

	// Popups (Dialogs)
	const popups = {
		elimination: document.getElementById("popup-elimination"),
		victory: document.getElementById("popup-victory"),
		hazardPicker: document.getElementById("hazard-picker"),
		howToPlay: document.getElementById("screen-how-to-play"), // Can be treated as a popup
		swiftJustice: document.getElementById('popup-swift-justice'), // ADDED Ref
	};

	// Buttons - General UI / Navigation
	const btnHelp = document.getElementById("btn-help");
	const btnBackToGame = document.getElementById("btn-back-to-game"); // Back from How-to-Play
	const btnBack = document.getElementById("btn-back"); // Back in Player Setup
	const btnNext = document.getElementById("btn-next"); // Next/Start Game in Player Setup
	const btnBackToStart = document.getElementById("btn-back-to-start"); // Back to Player Count screen from Setup

	// Buttons - Player Count Screen
	const playerCountButtons = screens.playerCount.querySelectorAll("button[data-count]");

	// Elements - Player Setup Screen
	const playerSetupTitle = document.getElementById("player-setup-title");
	const playerNameLabel = document.getElementById("player-name-label");
	const playerNameInput = document.getElementById("input-player-name");
	const classSelectionContainer = document.getElementById("class-selection-buttons");
	const classButtons = classSelectionContainer.querySelectorAll(".btn-class");
	const classDetailsName = document.getElementById("class-name");
	const classDetailsDescription = document.getElementById("class-description");
	const classDetailsAbilities = document.getElementById("class-abilities");
	const classDetailsContainer = document.getElementById("class-details-container");

	// Elements - Gameplay Screen
	const gameplayScreen = screens.gameplay;
	const actionBar = document.getElementById("action-bar");
	const gameBoard = document.getElementById("game-board");
	const playerInfoDisplay = document.getElementById("player-info"); // Container for status/info/controls below board
	const currentClassAbilitiesList = document.getElementById("info-class-abilities");
	const infoSilverBullet = document.getElementById("info-silver-bullet");
	// Note: statusBarPlayer/AP/Turn might be inside #status-bar, updated via innerHTML in updateUI now
	// const statusBarPlayer = document.getElementById("status-player");
	// const statusBarAP = document.getElementById("status-ap");
	// const statusBarTurn = document.getElementById("status-turn");
	const btnUndo = document.getElementById("btn-undo");
	const btnEndTurn = document.getElementById("btn-end-turn");
	const btnToggleLog = document.getElementById("btn-toggle-log");
	const gameLog = document.getElementById("game-log");
	const logList = document.getElementById("log-list");
	const btnBackToSetup = document.getElementById("btn-back-to-setup"); // Dev button

	// Buttons - Core Actions (Gameplay)
	const btnShoot = document.getElementById("action-shoot");
	const btnThrow = document.getElementById("action-throw");
	const btnSilverBullet = document.getElementById("action-silver-bullet");
	const btnDispel = document.getElementById("action-dispel");
	const btnBiteFuse = document.getElementById("action-bite-fuse");

	// Buttons - Class Abilities (Gameplay)
	const btnRampage = document.getElementById("action-rampage");
	const btnHandCannon = document.getElementById("action-hand-cannon");
	const btnContractPayoff = document.getElementById("action-contract-payoff");
	const btnOrderRestored = document.getElementById("action-order-restored");
	const btnVengeance = document.getElementById("action-vengeance");

	// Buttons - Movement (Gameplay)
	const movementBar = document.getElementById("movement-bar");
	const btnMoveN = document.getElementById("move-n");
	const btnMoveW = document.getElementById("move-w");
	const btnMoveE = document.getElementById("move-e");
	const btnMoveS = document.getElementById("move-s");

	// Elements - Hazard Picker Popup
	const hazardPickerOptions = document.getElementById("hazard-picker-options");
	const btnCancelThrow = document.getElementById("btn-cancel-throw");

	// Buttons - Swift Justice Popup
	const btnSwiftJusticeYes = document.getElementById('btn-swift-justice-yes'); // ADDED Ref
	const btnSwiftJusticeNo = document.getElementById('btn-swift-justice-no'); // ADDED Ref

	// --- 4. Function Definitions ---

    /**
     * Gets the emoji icon for a given hazard type.
     * @param {string} hazardType - The name of the hazard.
     * @returns {string} - The emoji string or '?' if not found.
     */
    function getHazardEmoji(hazardType) {
        switch (hazardType) {
            case "Tombstone": return "🪦";
            case "Black Widow": return "🕷️";
            case "Grave Dust": return "💩";
            case "Dynamite": return "💥";
            default: return "?"; // Fallback
        }
    }

	// --- Coordinate Helper Functions ---
	function getRowColFromCoord(coord) {
		if (!coord || typeof coord !== 'string' || coord.length < 2) return null;
		const colLetter = coord.charAt(0).toUpperCase();
		const rowNum = parseInt(coord.substring(1));
		if (isNaN(rowNum) || colLetter < "A" || colLetter > "I" || rowNum < 1 || rowNum > 9) return null;
		return {
			row: rowNum,
			col: colLetter.charCodeAt(0) - 64
		}; // A=1, B=2,... I=9
	}

	function getCoordFromRowCol(row, col) {
		if (row < 1 || row > 9 || col < 1 || col > 9) return null;
		const colLetter = String.fromCharCode(64 + col); // 1=A, 2=B,... 9=I
		return `${colLetter}${row}`;
	}

	function getAdjacentCoord(coord, direction) {
		const rc = getRowColFromCoord(coord);
		if (!rc) return null;
		let {
			row,
			col
		} = rc;
		if (direction === "N") row--;
		else if (direction === "S") row++;
		else if (direction === "E") col++;
		else if (direction === "W") col--;
		return getCoordFromRowCol(row, col); // Handles boundary checks
	}

	function getAllAdjacentCoords(coord) {
		const adjacentCoords = [];
		const rc = getRowColFromCoord(coord);
		if (!rc) return adjacentCoords;
		for (let dr = -1; dr <= 1; dr++) {
			for (let dc = -1; dc <= 1; dc++) {
				if (dr === 0 && dc === 0) continue; // Skip self
				const adjRow = rc.row + dr;
				const adjCol = rc.col + dc;
				const adjCoord = getCoordFromRowCol(adjRow, adjCol);
				if (adjCoord) adjacentCoords.push(adjCoord); // Add valid adjacent coordinates
			}
		}
		return adjacentCoords;
	}

	function getNewFacing(currentFacing, pivotType) {
		const currentIndex = DIRECTIONS.indexOf(currentFacing);
		if (currentIndex === -1) return currentFacing; // Invalid current facing
		let newIndex;
		if (pivotType === "L") newIndex = (currentIndex - 1 + DIRECTIONS.length) % DIRECTIONS.length;
		else if (pivotType === "R") newIndex = (currentIndex + 1) % DIRECTIONS.length;
		else if (pivotType === "180") newIndex = (currentIndex + 2) % DIRECTIONS.length;
		else return currentFacing; // Invalid pivot type
		return DIRECTIONS[newIndex];
	}

	function getDistance(coord1, coord2) {
		const rc1 = getRowColFromCoord(coord1);
		const rc2 = getRowColFromCoord(coord2);
		if (!rc1 || !rc2) return Infinity; // Cannot calculate distance for invalid coords
		// Manhattan distance
		return Math.abs(rc1.row - rc2.row) + Math.abs(rc1.col - rc2.col);
	}

    /**
     * Increments the count of a specific hazard type in the global hazard pool.
     * @param {string} hazardType - The type of hazard returning to the pool (e.g., "Tombstone", "Dynamite").
     */
    function returnHazardToPool(hazardType) {
        if (!currentGameState || !currentGameState.hazardPool) {
            console.error("returnHazardToPool: Cannot access hazard pool in game state!");
            return;
        }
        // Check if the hazard type exists in the pool object
        if (currentGameState.hazardPool.hasOwnProperty(hazardType)) {
            currentGameState.hazardPool[hazardType]++; // Increment the count
            console.log(`Returned ${hazardType} to pool. New count: ${currentGameState.hazardPool[hazardType]}`);
        } else {
            // Log a warning if trying to return an unknown type (shouldn't happen with valid types)
            console.warn(`returnHazardToPool: Tried to return unknown hazard type "${hazardType}" to pool.`);
        }
        // Optional: Update UI immediately if the hazard picker might be open?
        // Or rely on populateHazardPicker being called next time Throw is clicked. Let's rely on next call.
    }

	/**
	 * Gets all valid coordinates within a square radius around a center coordinate.
	 * Includes the center coordinate itself.
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
				const targetRow = centerRC.row + dr;
				const targetCol = centerRC.col + dc;
				const targetCoord = getCoordFromRowCol(targetRow, targetCol);
				if (targetCoord) {
					coords.push(targetCoord); // Only add valid board coordinates
				}
			}
		}
		return coords;
	}

	// --- UI Helper Functions ---

	/**
	 * Switches the visible screen OR displays a popup overlay.
	 * Manages hiding other screens/popups and tracking the last active screen.
	 * @param {string} screenId - The ID of the screen or popup to show.
	 */
	function showScreen(screenId) {
		const targetScreenElement = screens[screenId]; // Check if it's a main screen
		const targetPopupElement = popups[screenId]; // Check if it's a popup

		if (targetScreenElement) {
			// --- Showing a Main Screen ---
			// Find currently active main screen to store its ID (unless it's already the target)
			const currentActiveScreen = document.querySelector(".screen.active:not(.popup)");
			if (currentActiveScreen && currentActiveScreen.id !== screenId) {
				lastActiveScreenId = currentActiveScreen.id;
			}

			// Hide all main screens
			Object.values(screens).forEach(screen => screen?.classList.remove("active"));
			// Show the target main screen
			targetScreenElement.classList.add("active");
			console.log(`Showing screen: ${screenId}`);

			// Hide all popups when switching main screens
			Object.values(popups).forEach(popup => {
				if (popup) popup.style.display = "none";
			});

		} else if (targetPopupElement) {
			// --- Showing a Popup ---
			// Find the active main screen underneath to store its ID
			const currentActiveScreen = document.querySelector(".screen.active:not(.popup)");
			if (currentActiveScreen) {
				lastActiveScreenId = currentActiveScreen.id;
			} else {
				// Fallback if no main screen is active (should not normally happen)
				lastActiveScreenId = "gameplay"; // Default to gameplay?
				console.warn(`No active main screen found when showing popup ${screenId}. Storing fallback: ${lastActiveScreenId}`);
			}

			// Show the target popup (using style.display to overlay)
			targetPopupElement.style.display = "flex";
			console.log(`Showing popup: ${screenId}`);

		} else {
			console.error(`Screen/Popup with id "${screenId}" not found in screens or popups objects.`);
		}
	}

	/**
	 * Displays class details in the setup screen.
	 * @param {string | null} className - The name of the class, or null to clear details.
	 */
	function displayClassDetails(className) {
		// Use DOM references defined globally
		const data = className ? CLASS_DATA[className] : null;

		if (classDetailsName && classDetailsDescription && classDetailsAbilities && classDetailsContainer) {
			if (data) {
				classDetailsName.innerHTML = `<strong>Class:</strong> ${className}`;
				classDetailsDescription.textContent = data.description;
				classDetailsAbilities.innerHTML = ""; // Clear previous
				data.abilities.forEach((ability) => {
					const li = document.createElement("li");
					// Display simplified info in setup
					li.innerHTML = `<strong>${ability.name} (${ability.type}):</strong> ${ability.description}`;
					classDetailsAbilities.appendChild(li);
				});
				classDetailsContainer.style.display = "block"; // Show the details box
			} else {
				// Clear details if no class name provided
				classDetailsName.innerHTML = `<strong>Class:</strong> ---`;
				classDetailsDescription.textContent = "Select a class above to see details.";
				classDetailsAbilities.innerHTML = "<li>---</li>";
				// Optionally hide the container if preferred: classDetailsContainer.style.display = "none";
			}
		} else {
			console.error("One or more class details elements not found in setup screen.");
		}
	}

	/**
	 * Updates the player setup screen UI for the specified player index.
	 * @param {number} playerIndex - The index (0-based) of the player being set up.
	 */
	function updatePlayerSetupScreen(playerIndex) {
		const playerNum = playerIndex + 1;
		currentPlayerSetupIndex = playerIndex;
		console.log(`Setting up screen for Player ${playerNum}`);

		// Ensure player data structure exists
		if (!playerData[playerIndex]) {
			playerData[playerIndex] = {
				name: `P${playerNum}`,
				class: null
			};
		} else {
			// Reset class selection when revisiting this player via "Back" button
			playerData[playerIndex].class = null;
		}

		// Update player name input field
		if (playerNameInput) {
			playerNameInput.value = (playerData[playerIndex].name && playerData[playerIndex].name !== `P${playerNum}`) ? playerData[playerIndex].name : "";
			playerNameInput.placeholder = `P${playerNum} Name (Optional)`;
		}
		if (playerSetupTitle) playerSetupTitle.textContent = `Player ${playerNum} Setup`;
		if (playerNameLabel) playerNameLabel.textContent = `Player ${playerNum} Name:`;

		// Update class button states (deselected, disable already chosen)
		if (classSelectionContainer) {
			let previouslySelectedButton = classSelectionContainer.querySelector(".selected");
			if (previouslySelectedButton) {
				previouslySelectedButton.classList.remove("selected");
			}
		}
		classButtons.forEach((button) => {
			const className = button.dataset.class;
			button.disabled = selectedClasses.includes(className);
			button.style.opacity = button.disabled ? "0.6" : "1"; // Adjust opacity for disabled
		});

		// Clear class details display
		displayClassDetails(null);

		// Update navigation buttons visibility
		const isFirstPlayer = playerIndex === 0;
		if (btnBack) btnBack.style.display = isFirstPlayer ? "none" : "inline-block";
		if (btnBackToStart) btnBackToStart.style.display = isFirstPlayer ? "none" : "inline-block";
		if (btnNext) {
			btnNext.textContent = (playerIndex === numberOfPlayers - 1) ? "Start Game" : "Next";
			btnNext.disabled = true; // Disable until a class is selected
		}
	}

	/**
	 * Adds a message to the game log UI.
	 * @param {string} message - The message string to log.
	 */
	function addToLog(message) {
		if (!logList) return; // Safety check
		const li = document.createElement("li");
		li.textContent = message; // Use textContent for safety against HTML injection
		// Optional: Limit log length
		while (logList.children.length >= 50) { // Limit to 50 entries
			logList.removeChild(logList.firstChild);
		}
		logList.appendChild(li);
		// Scroll to bottom if log is visible
		if (gameLog && !gameLog.classList.contains("log-hidden")) {
			gameLog.scrollTop = gameLog.scrollHeight;
		}
		// Also log to console for easier debugging
		console.log("Game Log:", message);
	}

	/**
	 * Generates the 9x9 grid elements for the game board.
	 */
	function generateGrid() {
		if (!gameBoard) {
			console.error("Game board element not found!");
			return;
		}
		gameBoard.innerHTML = ""; // Clear previous grid
		for (let r = 1; r <= 9; r++) {
			for (let c = 1; c <= 9; c++) {
				const square = document.createElement("div");
				const coord = getCoordFromRowCol(r, c); // Use helper function
				if (coord) {
					square.classList.add("grid-square");
					square.dataset.coord = coord;
					// Optional: Add coordinate text for debugging
					// const coordText = document.createElement('span');
					// coordText.textContent = coord;
					// coordText.style.fontSize = '0.5em';
					// coordText.style.position = 'absolute';
					// coordText.style.bottom = '1px';
					// coordText.style.right = '2px';
					// square.appendChild(coordText);
					gameBoard.appendChild(square);
				}
			}
		}
		console.log("Generated 9x9 grid.");
	}

	/**
	 * Gets the CSS color class name for a player based on their assigned faction class.
	 * @param {number} playerIndex - The index of the player.
	 * @returns {string} - The CSS class name (e.g., "color-sheriff") or empty string.
	 */
	function getPlayerColorClass(playerIndex) {
		const player = currentGameState?.players?.[playerIndex];
		return player?.class ? CLASS_DATA[player.class]?.color || "" : "";
	}

	/**
	 * Removes target highlight classes from all grid squares.
	 */
	function clearHighlights() {
		const highlightedSquares = document.querySelectorAll(".grid-square.valid-target, .grid-square.invalid-target");
		highlightedSquares.forEach((el) => el.classList.remove("valid-target", "invalid-target"));
	}

	// --- Batch 1 Ends Here ---
	// Next batch will start with LAYOUT_DATA constant.

	// --- Layout Data ---
	// Defines starting positions for different player counts.
	// Keys: Number of players (2, 3, 4)
	// Values: Array of possible layout objects for that player count.
	// Each layout object contains: vampires[], bloodwells[], hazards[]
	const LAYOUT_DATA = {
		2: [
			// --- 2P Layout 1 (4T, 3BW, 3GD) ---
			{
				vampires: [{
						player: 0,
						coord: "B2",
						facing: "S",
						id: "P1V1"
					},
					{
						player: 0,
						coord: "D2",
						facing: "S",
						id: "P1V2"
					},
					{
						player: 1,
						coord: "H8",
						facing: "N",
						id: "P2V1"
					},
					{
						player: 1,
						coord: "F8",
						facing: "N",
						id: "P2V2"
					},
				],
				bloodwells: [{
						player: 0,
						coord: "A1",
						id: "P1BW1"
					},
					{
						player: 0,
						coord: "C1",
						id: "P1BW2"
					},
					{
						player: 0,
						coord: "E1",
						id: "P1BW3"
					},
					{
						player: 1,
						coord: "I9",
						id: "P2BW1"
					},
					{
						player: 1,
						coord: "G9",
						id: "P2BW2"
					},
					{
						player: 1,
						coord: "E9",
						id: "P2BW3"
					},
				],
				hazards: [{
						type: "Tombstone",
						coord: "C4"
					},
					{
						type: "Tombstone",
						coord: "G6"
					},
					{
						type: "Tombstone",
						coord: "E5"
					},
					{
						type: "Tombstone",
						coord: "E7"
					},
					{
						type: "Black Widow",
						coord: "D6"
					},
					{
						type: "Black Widow",
						coord: "F4"
					},
					{
						type: "Black Widow",
						coord: "H5"
					},
					{
						type: "Grave Dust",
						coord: "B5"
					},
					{
						type: "Grave Dust",
						coord: "E3"
					},
					{
						type: "Grave Dust",
						coord: "G5"
					},
				],
			},
			// --- 2P Layout 2 (3T, 4BW, 3GD) ---
			{
				vampires: [{
						player: 0,
						coord: "A3",
						facing: "E",
						id: "P1V1"
					},
					{
						player: 0,
						coord: "A5",
						facing: "E",
						id: "P1V2"
					},
					{
						player: 1,
						coord: "I7",
						facing: "W",
						id: "P2V1"
					},
					{
						player: 1,
						coord: "I5",
						facing: "W",
						id: "P2V2"
					},
				],
				bloodwells: [{
						player: 0,
						coord: "B1",
						id: "P1BW1"
					},
					{
						player: 0,
						coord: "B4",
						id: "P1BW2"
					},
					{
						player: 0,
						coord: "B6",
						id: "P1BW3"
					},
					{
						player: 1,
						coord: "H9",
						id: "P2BW1"
					},
					{
						player: 1,
						coord: "H6",
						id: "P2BW2"
					},
					{
						player: 1,
						coord: "H4",
						id: "P2BW3"
					},
				],
				hazards: [{
						type: "Tombstone",
						coord: "D4"
					},
					{
						type: "Tombstone",
						coord: "F6"
					},
					{
						type: "Tombstone",
						coord: "E8"
					},
					{
						type: "Black Widow",
						coord: "C7"
					},
					{
						type: "Black Widow",
						coord: "E5"
					},
					{
						type: "Black Widow",
						coord: "G3"
					},
					{
						type: "Black Widow",
						coord: "D2"
					},
					{
						type: "Grave Dust",
						coord: "C3"
					},
					{
						type: "Grave Dust",
						coord: "E2"
					},
					{
						type: "Grave Dust",
						coord: "G7"
					},
				],
			},
			// --- 2P Layout 3 (3T, 3BW, 4GD) ---
			{
				vampires: [{
						player: 0,
						coord: "C3",
						facing: "S",
						id: "P1V1"
					},
					{
						player: 0,
						coord: "E1",
						facing: "S",
						id: "P1V2"
					},
					{
						player: 1,
						coord: "G7",
						facing: "N",
						id: "P2V1"
					},
					{
						player: 1,
						coord: "E9",
						facing: "N",
						id: "P2V2"
					},
				],
				bloodwells: [{
						player: 0,
						coord: "A2",
						id: "P1BW1"
					},
					{
						player: 0,
						coord: "D2",
						id: "P1BW2"
					},
					{
						player: 0,
						coord: "G2",
						id: "P1BW3"
					},
					{
						player: 1,
						coord: "C8",
						id: "P2BW1"
					},
					{
						player: 1,
						coord: "F8",
						id: "P2BW2"
					},
					{
						player: 1,
						coord: "I8",
						id: "P2BW3"
					},
				],
				hazards: [{
						type: "Tombstone",
						coord: "C5"
					},
					{
						type: "Tombstone",
						coord: "G5"
					},
					{
						type: "Tombstone",
						coord: "E4"
					},
					{
						type: "Black Widow",
						coord: "E6"
					},
					{
						type: "Black Widow",
						coord: "D4"
					},
					{
						type: "Black Widow",
						coord: "F6"
					},
					{
						type: "Grave Dust",
						coord: "B7"
					},
					{
						type: "Grave Dust",
						coord: "H3"
					},
					{
						type: "Grave Dust",
						coord: "E7"
					},
					{
						type: "Grave Dust",
						coord: "D3"
					},
				],
			},
			// --- 2P Layout 4 (4T, 4BW, 2GD) ---
			{
				vampires: [{
						player: 0,
						coord: "B1",
						facing: "S",
						id: "P1V1"
					},
					{
						player: 0,
						coord: "B3",
						facing: "S",
						id: "P1V2"
					},
					{
						player: 1,
						coord: "H9",
						facing: "N",
						id: "P2V1"
					},
					{
						player: 1,
						coord: "H7",
						facing: "N",
						id: "P2V2"
					},
				],
				bloodwells: [{
						player: 0,
						coord: "A2",
						id: "P1BW1"
					},
					{
						player: 0,
						coord: "C2",
						id: "P1BW2"
					},
					{
						player: 0,
						coord: "D4",
						id: "P1BW3"
					},
					{
						player: 1,
						coord: "I8",
						id: "P2BW1"
					},
					{
						player: 1,
						coord: "G8",
						id: "P2BW2"
					},
					{
						player: 1,
						coord: "F6",
						id: "P2BW3"
					},
				],
				hazards: [{
						type: "Tombstone",
						coord: "D5"
					},
					{
						type: "Tombstone",
						coord: "F5"
					},
					{
						type: "Tombstone",
						coord: "C7"
					},
					{
						type: "Tombstone",
						coord: "G3"
					},
					{
						type: "Black Widow",
						coord: "E4"
					},
					{
						type: "Black Widow",
						coord: "E6"
					},
					{
						type: "Black Widow",
						coord: "B5"
					},
					{
						type: "Black Widow",
						coord: "H5"
					},
					{
						type: "Grave Dust",
						coord: "D3"
					},
					{
						type: "Grave Dust",
						coord: "F7"
					},
				],
			},
			// --- 2P Layout 5 (4T, 2BW, 4GD) ---
			{
				vampires: [{
						player: 0,
						coord: "A8",
						facing: "E",
						id: "P1V1"
					},
					{
						player: 0,
						coord: "C9",
						facing: "E",
						id: "P1V2"
					},
					{
						player: 1,
						coord: "I2",
						facing: "W",
						id: "P2V1"
					},
					{
						player: 1,
						coord: "G1",
						facing: "W",
						id: "P2V2"
					},
				],
				bloodwells: [{
						player: 0,
						coord: "B7",
						id: "P1BW1"
					},
					{
						player: 0,
						coord: "D7",
						id: "P1BW2"
					},
					{
						player: 0,
						coord: "B9",
						id: "P1BW3"
					},
					{
						player: 1,
						coord: "H3",
						id: "P2BW1"
					},
					{
						player: 1,
						coord: "F3",
						id: "P2BW2"
					},
					{
						player: 1,
						coord: "H1",
						id: "P2BW3"
					},
				],
				hazards: [{
						type: "Tombstone",
						coord: "E4"
					},
					{
						type: "Tombstone",
						coord: "E6"
					},
					{
						type: "Tombstone",
						coord: "C5"
					},
					{
						type: "Tombstone",
						coord: "G5"
					},
					{
						type: "Black Widow",
						coord: "D3"
					},
					{
						type: "Black Widow",
						coord: "F7"
					},
					{
						type: "Grave Dust",
						coord: "D7"
					},
					{
						type: "Grave Dust",
						coord: "F3"
					},
					{
						type: "Grave Dust",
						coord: "B4"
					},
					{
						type: "Grave Dust",
						coord: "H6"
					},
				],
			},
		],
		3: [
			// --- 3P Layout 1 (4T, 3BW, 3GD) ---
			{
				vampires: [{
						player: 0,
						coord: "B2",
						facing: "S",
						id: "P1V1"
					},
					{
						player: 0,
						coord: "D1",
						facing: "S",
						id: "P1V2"
					}, // Top-Left
					{
						player: 1,
						coord: "F1",
						facing: "S",
						id: "P2V1"
					},
					{
						player: 1,
						coord: "H2",
						facing: "S",
						id: "P2V2"
					}, // Top-Right
					{
						player: 2,
						coord: "E9",
						facing: "N",
						id: "P3V1"
					},
					{
						player: 2,
						coord: "G8",
						facing: "W",
						id: "P3V2"
					}, // Bottom-Middle/Right
				],
				bloodwells: [{
						player: 0,
						coord: "A1",
						id: "P1BW1"
					},
					{
						player: 0,
						coord: "C1",
						id: "P1BW2"
					},
					{
						player: 0,
						coord: "B3",
						id: "P1BW3"
					},
					{
						player: 1,
						coord: "I1",
						id: "P2BW1"
					},
					{
						player: 1,
						coord: "G1",
						id: "P2BW2"
					},
					{
						player: 1,
						coord: "H3",
						id: "P2BW3"
					},
					{
						player: 2,
						coord: "D9",
						id: "P3BW1"
					},
					{
						player: 2,
						coord: "F9",
						id: "P3BW2"
					},
					{
						player: 2,
						coord: "H9",
						id: "P3BW3"
					},
				],
				hazards: [{
						type: "Tombstone",
						coord: "D4"
					},
					{
						type: "Tombstone",
						coord: "F4"
					},
					{
						type: "Tombstone",
						coord: "E6"
					},
					{
						type: "Tombstone",
						coord: "C6"
					},
					{
						type: "Black Widow",
						coord: "E2"
					},
					{
						type: "Black Widow",
						coord: "G5"
					},
					{
						type: "Black Widow",
						coord: "B5"
					},
					{
						type: "Grave Dust",
						coord: "D7"
					},
					{
						type: "Grave Dust",
						coord: "F7"
					},
					{
						type: "Grave Dust",
						coord: "E5"
					},
				],
			},
			// --- 3P Layout 2 (3T, 4BW, 3GD) ---
			{
				vampires: [{
						player: 0,
						coord: "A4",
						facing: "E",
						id: "P1V1"
					},
					{
						player: 0,
						coord: "C2",
						facing: "S",
						id: "P1V2"
					}, // Left/Top-Left
					{
						player: 1,
						coord: "G2",
						facing: "S",
						id: "P2V1"
					},
					{
						player: 1,
						coord: "I4",
						facing: "W",
						id: "P2V2"
					}, // Right/Top-Right
					{
						player: 2,
						coord: "C8",
						facing: "N",
						id: "P3V1"
					},
					{
						player: 2,
						coord: "G8",
						facing: "N",
						id: "P3V2"
					}, // Bottom
				],
				bloodwells: [{
						player: 0,
						coord: "B1",
						id: "P1BW1"
					},
					{
						player: 0,
						coord: "A6",
						id: "P1BW2"
					},
					{
						player: 0,
						coord: "D3",
						id: "P1BW3"
					},
					{
						player: 1,
						coord: "H1",
						id: "P2BW1"
					},
					{
						player: 1,
						coord: "I6",
						id: "P2BW2"
					},
					{
						player: 1,
						coord: "F3",
						id: "P2BW3"
					},
					{
						player: 2,
						coord: "B9",
						id: "P3BW1"
					},
					{
						player: 2,
						coord: "E9",
						id: "P3BW2"
					},
					{
						player: 2,
						coord: "H9",
						id: "P3BW3"
					},
				],
				hazards: [{
						type: "Tombstone",
						coord: "E4"
					},
					{
						type: "Tombstone",
						coord: "C6"
					},
					{
						type: "Tombstone",
						coord: "G6"
					},
					{
						type: "Black Widow",
						coord: "E6"
					},
					{
						type: "Black Widow",
						coord: "D5"
					},
					{
						type: "Black Widow",
						coord: "F5"
					},
					{
						type: "Black Widow",
						coord: "E7"
					},
					{
						type: "Grave Dust",
						coord: "B4"
					},
					{
						type: "Grave Dust",
						coord: "H4"
					},
					{
						type: "Grave Dust",
						coord: "E2"
					},
				],
			},
			// --- 3P Layout 3 (3T, 3BW, 4GD) ---
			{
				vampires: [{
						player: 0,
						coord: "E1",
						facing: "S",
						id: "P1V1"
					},
					{
						player: 0,
						coord: "G3",
						facing: "W",
						id: "P1V2"
					}, // Top-Right/East
					{
						player: 1,
						coord: "A5",
						facing: "S",
						id: "P2V1"
					},
					{
						player: 1,
						coord: "C3",
						facing: "E",
						id: "P2V2"
					}, // West/Top-Left
					{
						player: 2,
						coord: "C7",
						facing: "N",
						id: "P3V1"
					},
					{
						player: 2,
						coord: "G7",
						facing: "N",
						id: "P3V2"
					}, // South
				],
				bloodwells: [{
						player: 0,
						coord: "I2",
						id: "P1BW1"
					},
					{
						player: 0,
						coord: "G1",
						id: "P1BW2"
					},
					{
						player: 0,
						coord: "I4",
						id: "P1BW3"
					},
					{
						player: 1,
						coord: "A1",
						id: "P2BW1"
					},
					{
						player: 1,
						coord: "A3",
						id: "P2BW2"
					},
					{
						player: 1,
						coord: "C1",
						id: "P2BW3"
					},
					{
						player: 2,
						coord: "B9",
						id: "P3BW1"
					},
					{
						player: 2,
						coord: "E9",
						id: "P3BW2"
					},
					{
						player: 2,
						coord: "H9",
						id: "P3BW3"
					},
				],
				hazards: [{
						type: "Tombstone",
						coord: "D5"
					},
					{
						type: "Tombstone",
						coord: "F5"
					},
					{
						type: "Tombstone",
						coord: "E3"
					},
					{
						type: "Black Widow",
						coord: "E7"
					},
					{
						type: "Black Widow",
						coord: "C6"
					},
					{
						type: "Black Widow",
						coord: "G4"
					},
					{
						type: "Grave Dust",
						coord: "B4"
					},
					{
						type: "Grave Dust",
						coord: "H6"
					},
					{
						type: "Grave Dust",
						coord: "D2"
					},
					{
						type: "Grave Dust",
						coord: "F8"
					},
				],
			},
			// --- 3P Layout 4 (4T, 4BW, 2GD) ---
			{
				vampires: [{
						player: 0,
						coord: "B1",
						facing: "S",
						id: "P1V1"
					},
					{
						player: 0,
						coord: "C3",
						facing: "E",
						id: "P1V2"
					}, // Top-Left
					{
						player: 1,
						coord: "H1",
						facing: "S",
						id: "P2V1"
					},
					{
						player: 1,
						coord: "G3",
						facing: "W",
						id: "P2V2"
					}, // Top-Right
					{
						player: 2,
						coord: "E8",
						facing: "N",
						id: "P3V1"
					},
					{
						player: 2,
						coord: "E6",
						facing: "N",
						id: "P3V2"
					}, // Bottom-Middle
				],
				bloodwells: [{
						player: 0,
						coord: "A2",
						id: "P1BW1"
					},
					{
						player: 0,
						coord: "A4",
						id: "P1BW2"
					},
					{
						player: 0,
						coord: "D2",
						id: "P1BW3"
					},
					{
						player: 1,
						coord: "I2",
						id: "P2BW1"
					},
					{
						player: 1,
						coord: "I4",
						id: "P2BW2"
					},
					{
						player: 1,
						coord: "F2",
						id: "P2BW3"
					},
					{
						player: 2,
						coord: "C9",
						id: "P3BW1"
					},
					{
						player: 2,
						coord: "E9",
						id: "P3BW2"
					},
					{
						player: 2,
						coord: "G9",
						id: "P3BW3"
					},
				],
				hazards: [{
						type: "Tombstone",
						coord: "E4"
					},
					{
						type: "Tombstone",
						coord: "C5"
					},
					{
						type: "Tombstone",
						coord: "G5"
					},
					{
						type: "Tombstone",
						coord: "E6"
					}, // E6 hazard blocks P3V2 initial move
					{
						type: "Black Widow",
						coord: "D3"
					},
					{
						type: "Black Widow",
						coord: "F3"
					},
					{
						type: "Black Widow",
						coord: "D7"
					},
					{
						type: "Black Widow",
						coord: "F7"
					},
					{
						type: "Grave Dust",
						coord: "B6"
					},
					{
						type: "Grave Dust",
						coord: "H6"
					},
				],
			},
			// --- 3P Layout 5 (4T, 2BW, 4GD) ---
			{
				vampires: [{
						player: 0,
						coord: "A7",
						facing: "N",
						id: "P1V1"
					},
					{
						player: 0,
						coord: "C9",
						facing: "E",
						id: "P1V2"
					}, // Bottom-Left
					{
						player: 1,
						coord: "G9",
						facing: "W",
						id: "P2V1"
					},
					{
						player: 1,
						coord: "I7",
						facing: "N",
						id: "P2V2"
					}, // Bottom-Right
					{
						player: 2,
						coord: "C1",
						facing: "S",
						id: "P3V1"
					},
					{
						player: 2,
						coord: "G1",
						facing: "S",
						id: "P3V2"
					}, // Top
				],
				bloodwells: [{
						player: 0,
						coord: "A9",
						id: "P1BW1"
					},
					{
						player: 0,
						coord: "B8",
						id: "P1BW2"
					},
					{
						player: 0,
						coord: "D9",
						id: "P1BW3"
					},
					{
						player: 1,
						coord: "I9",
						id: "P2BW1"
					},
					{
						player: 1,
						coord: "H8",
						id: "P2BW2"
					},
					{
						player: 1,
						coord: "F9",
						id: "P2BW3"
					},
					{
						player: 2,
						coord: "A2",
						id: "P3BW1"
					},
					{
						player: 2,
						coord: "E2",
						id: "P3BW2"
					},
					{
						player: 2,
						coord: "I2",
						id: "P3BW3"
					},
				],
				hazards: [{
						type: "Tombstone",
						coord: "E4"
					},
					{
						type: "Tombstone",
						coord: "E6"
					},
					{
						type: "Tombstone",
						coord: "C5"
					},
					{
						type: "Tombstone",
						coord: "G5"
					},
					{
						type: "Black Widow",
						coord: "D3"
					},
					{
						type: "Black Widow",
						coord: "F7"
					},
					{
						type: "Grave Dust",
						coord: "D7"
					},
					{
						type: "Grave Dust",
						coord: "F3"
					},
					{
						type: "Grave Dust",
						coord: "B5"
					},
					{
						type: "Grave Dust",
						coord: "H5"
					},
				],
			},
		],
		4: [
			// --- 4P Layout 1 (4T, 3BW, 3GD) ---
			{
				vampires: [{
						player: 0,
						coord: "B2",
						facing: "S",
						id: "P1V1"
					},
					{
						player: 0,
						coord: "C1",
						facing: "E",
						id: "P1V2"
					}, // TL
					{
						player: 1,
						coord: "G1",
						facing: "W",
						id: "P2V1"
					},
					{
						player: 1,
						coord: "H2",
						facing: "S",
						id: "P2V2"
					}, // TR
					{
						player: 2,
						coord: "B8",
						facing: "N",
						id: "P3V1"
					},
					{
						player: 2,
						coord: "C9",
						facing: "E",
						id: "P3V2"
					}, // BL
					{
						player: 3,
						coord: "G9",
						facing: "W",
						id: "P4V1"
					},
					{
						player: 3,
						coord: "H8",
						facing: "N",
						id: "P4V2"
					}, // BR
				],
				bloodwells: [{
						player: 0,
						coord: "A1",
						id: "P1BW1"
					},
					{
						player: 0,
						coord: "A3",
						id: "P1BW2"
					},
					{
						player: 0,
						coord: "D1",
						id: "P1BW3"
					},
					{
						player: 1,
						coord: "I1",
						id: "P2BW1"
					},
					{
						player: 1,
						coord: "I3",
						id: "P2BW2"
					},
					{
						player: 1,
						coord: "F1",
						id: "P2BW3"
					},
					{
						player: 2,
						coord: "A9",
						id: "P3BW1"
					},
					{
						player: 2,
						coord: "A7",
						id: "P3BW2"
					},
					{
						player: 2,
						coord: "D9",
						id: "P3BW3"
					},
					{
						player: 3,
						coord: "I9",
						id: "P4BW1"
					},
					{
						player: 3,
						coord: "I7",
						id: "P4BW2"
					},
					{
						player: 3,
						coord: "F9",
						id: "P4BW3"
					},
				],
				hazards: [{
						type: "Tombstone",
						coord: "E3"
					},
					{
						type: "Tombstone",
						coord: "C5"
					},
					{
						type: "Tombstone",
						coord: "G5"
					},
					{
						type: "Tombstone",
						coord: "E7"
					},
					{
						type: "Black Widow",
						coord: "D4"
					},
					{
						type: "Black Widow",
						coord: "F6"
					},
					{
						type: "Black Widow",
						coord: "B7"
					},
					{
						type: "Grave Dust",
						coord: "H4"
					},
					{
						type: "Grave Dust",
						coord: "E5"
					},
					{
						type: "Grave Dust",
						coord: "D6"
					},
				],
			},
			// --- 4P Layout 2 (3T, 4BW, 3GD) ---
			{
				vampires: [{
						player: 0,
						coord: "A2",
						facing: "E",
						id: "P1V1"
					},
					{
						player: 0,
						coord: "C1",
						facing: "S",
						id: "P1V2"
					}, // TL
					{
						player: 1,
						coord: "I2",
						facing: "W",
						id: "P2V1"
					},
					{
						player: 1,
						coord: "G1",
						facing: "S",
						id: "P2V2"
					}, // TR
					{
						player: 2,
						coord: "A8",
						facing: "E",
						id: "P3V1"
					},
					{
						player: 2,
						coord: "C9",
						facing: "N",
						id: "P3V2"
					}, // BL
					{
						player: 3,
						coord: "I8",
						facing: "W",
						id: "P4V1"
					},
					{
						player: 3,
						coord: "G9",
						facing: "N",
						id: "P4V2"
					}, // BR
				],
				bloodwells: [{
						player: 0,
						coord: "B3",
						id: "P1BW1"
					},
					{
						player: 0,
						coord: "D2",
						id: "P1BW2"
					},
					{
						player: 0,
						coord: "B1",
						id: "P1BW3"
					},
					{
						player: 1,
						coord: "H3",
						id: "P2BW1"
					},
					{
						player: 1,
						coord: "F2",
						id: "P2BW2"
					},
					{
						player: 1,
						coord: "H1",
						id: "P2BW3"
					},
					{
						player: 2,
						coord: "B7",
						id: "P3BW1"
					},
					{
						player: 2,
						coord: "D8",
						id: "P3BW2"
					},
					{
						player: 2,
						coord: "B9",
						id: "P3BW3"
					},
					{
						player: 3,
						coord: "H7",
						id: "P4BW1"
					},
					{
						player: 3,
						coord: "F8",
						id: "P4BW2"
					},
					{
						player: 3,
						coord: "H9",
						id: "P4BW3"
					},
				],
				hazards: [{
						type: "Tombstone",
						coord: "D5"
					},
					{
						type: "Tombstone",
						coord: "F5"
					},
					{
						type: "Tombstone",
						coord: "E7"
					},
					{
						type: "Black Widow",
						coord: "E3"
					},
					{
						type: "Black Widow",
						coord: "C4"
					},
					{
						type: "Black Widow",
						coord: "G6"
					},
					{
						type: "Black Widow",
						coord: "E5"
					},
					{
						type: "Grave Dust",
						coord: "D7"
					},
					{
						type: "Grave Dust",
						coord: "F3"
					},
					{
						type: "Grave Dust",
						coord: "B5"
					},
				],
			},
			// --- 4P Layout 3 (3T, 3BW, 4GD) ---
			{
				vampires: [{
						player: 0,
						coord: "B3",
						facing: "S",
						id: "P1V1"
					},
					{
						player: 0,
						coord: "D3",
						facing: "E",
						id: "P1V2"
					}, // Top-Leftish
					{
						player: 1,
						coord: "F3",
						facing: "W",
						id: "P2V1"
					},
					{
						player: 1,
						coord: "H3",
						facing: "S",
						id: "P2V2"
					}, // Top-Rightish
					{
						player: 2,
						coord: "B7",
						facing: "N",
						id: "P3V1"
					},
					{
						player: 2,
						coord: "D7",
						facing: "E",
						id: "P3V2"
					}, // Bottom-Leftish
					{
						player: 3,
						coord: "F7",
						facing: "W",
						id: "P4V1"
					},
					{
						player: 3,
						coord: "H7",
						facing: "N",
						id: "P4V2"
					}, // Bottom-Rightish
				],
				bloodwells: [{
						player: 0,
						coord: "A1",
						id: "P1BW1"
					},
					{
						player: 0,
						coord: "C1",
						id: "P1BW2"
					},
					{
						player: 0,
						coord: "E1",
						id: "P1BW3"
					},
					{
						player: 1,
						coord: "G1",
						id: "P2BW1"
					},
					{
						player: 1,
						coord: "I1",
						id: "P2BW2"
					},
					{
						player: 1,
						coord: "E2",
						id: "P2BW3"
					}, // P2 BW slightly different
					{
						player: 2,
						coord: "A9",
						id: "P3BW1"
					},
					{
						player: 2,
						coord: "C9",
						id: "P3BW2"
					},
					{
						player: 2,
						coord: "E9",
						id: "P3BW3"
					},
					{
						player: 3,
						coord: "G9",
						id: "P4BW1"
					},
					{
						player: 3,
						coord: "I9",
						id: "P4BW2"
					},
					{
						player: 3,
						coord: "E8",
						id: "P4BW3"
					}, // P4 BW slightly different
				],
				hazards: [{
						type: "Tombstone",
						coord: "E4"
					},
					{
						type: "Tombstone",
						coord: "C6"
					},
					{
						type: "Tombstone",
						coord: "G6"
					},
					{
						type: "Black Widow",
						coord: "D5"
					},
					{
						type: "Black Widow",
						coord: "F5"
					},
					{
						type: "Black Widow",
						coord: "E6"
					}, // Center heavy BW
					{
						type: "Grave Dust",
						coord: "B5"
					},
					{
						type: "Grave Dust",
						coord: "H5"
					},
					{
						type: "Grave Dust",
						coord: "D2"
					},
					{
						type: "Grave Dust",
						coord: "F8"
					},
				],
			},
			// --- 4P Layout 4 (4T, 4BW, 2GD) ---
			{
				vampires: [{
						player: 0,
						coord: "A3",
						facing: "S",
						id: "P1V1"
					},
					{
						player: 0,
						coord: "B1",
						facing: "E",
						id: "P1V2"
					}, // TL Corner
					{
						player: 1,
						coord: "G1",
						facing: "W",
						id: "P2V1"
					},
					{
						player: 1,
						coord: "I3",
						facing: "N",
						id: "P2V2"
					}, // TR Corner
					{
						player: 2,
						coord: "C9",
						facing: "E",
						id: "P3V1"
					},
					{
						player: 2,
						coord: "A7",
						facing: "S",
						id: "P3V2"
					}, // BL Corner
					{
						player: 3,
						coord: "I7",
						facing: "N",
						id: "P4V1"
					},
					{
						player: 3,
						coord: "G9",
						facing: "W",
						id: "P4V2"
					}, // BR Corner
				],
				bloodwells: [{
						player: 0,
						coord: "C3",
						id: "P1BW1"
					},
					{
						player: 0,
						coord: "D1",
						id: "P1BW2"
					},
					{
						player: 0,
						coord: "A1",
						id: "P1BW3"
					},
					{
						player: 1,
						coord: "G3",
						id: "P2BW1"
					},
					{
						player: 1,
						coord: "F1",
						id: "P2BW2"
					},
					{
						player: 1,
						coord: "I1",
						id: "P2BW3"
					},
					{
						player: 2,
						coord: "C7",
						id: "P3BW1"
					},
					{
						player: 2,
						coord: "D9",
						id: "P3BW2"
					},
					{
						player: 2,
						coord: "A9",
						id: "P3BW3"
					},
					{
						player: 3,
						coord: "G7",
						id: "P4BW1"
					},
					{
						player: 3,
						coord: "F9",
						id: "P4BW2"
					},
					{
						player: 3,
						coord: "I9",
						id: "P4BW3"
					},
				],
				hazards: [{
						type: "Tombstone",
						coord: "E2"
					},
					{
						type: "Tombstone",
						coord: "B5"
					},
					{
						type: "Tombstone",
						coord: "H5"
					},
					{
						type: "Tombstone",
						coord: "E8"
					},
					{
						type: "Black Widow",
						coord: "E4"
					},
					{
						type: "Black Widow",
						coord: "D6"
					},
					{
						type: "Black Widow",
						coord: "F6"
					},
					{
						type: "Black Widow",
						coord: "E6"
					},
					{
						type: "Grave Dust",
						coord: "C4"
					},
					{
						type: "Grave Dust",
						coord: "G4"
					},
				],
			},
			// --- 4P Layout 5 (2T, 4BW, 4GD) --- *Alternate distribution*
			{
				vampires: [{
						player: 0,
						coord: "A5",
						facing: "S",
						id: "P1V1"
					},
					{
						player: 0,
						coord: "C5",
						facing: "E",
						id: "P1V2"
					}, // West Mid
					{
						player: 1,
						coord: "E3",
						facing: "W",
						id: "P2V1"
					},
					{
						player: 1,
						coord: "E1",
						facing: "S",
						id: "P2V2"
					}, // North Mid
					{
						player: 2,
						coord: "G5",
						facing: "W",
						id: "P3V1"
					},
					{
						player: 2,
						coord: "I5",
						facing: "N",
						id: "P3V2"
					}, // East Mid
					{
						player: 3,
						coord: "E7",
						facing: "E",
						id: "P4V1"
					},
					{
						player: 3,
						coord: "E9",
						facing: "N",
						id: "P4V2"
					}, // South Mid
				],
				bloodwells: [{
						player: 0,
						coord: "A3",
						id: "P1BW1"
					},
					{
						player: 0,
						coord: "A7",
						id: "P1BW2"
					},
					{
						player: 0,
						coord: "C3",
						id: "P1BW3"
					},
					{
						player: 1,
						coord: "C1",
						id: "P2BW1"
					},
					{
						player: 1,
						coord: "G1",
						id: "P2BW2"
					},
					{
						player: 1,
						coord: "G3",
						id: "P2BW3"
					},
					{
						player: 2,
						coord: "I3",
						id: "P3BW1"
					},
					{
						player: 2,
						coord: "I7",
						id: "P3BW2"
					},
					{
						player: 2,
						coord: "G7",
						id: "P3BW3"
					},
					{
						player: 3,
						coord: "C7",
						id: "P4BW1"
					},
					{
						player: 3,
						coord: "G9",
						id: "P4BW2"
					},
					{
						player: 3,
						coord: "C9",
						id: "P4BW3"
					},
				],
				hazards: [{
						type: "Tombstone",
						coord: "D4"
					},
					{
						type: "Tombstone",
						coord: "F6"
					}, // Only two tombstones
					{
						type: "Black Widow",
						coord: "F4"
					},
					{
						type: "Black Widow",
						coord: "D6"
					},
					{
						type: "Black Widow",
						coord: "B7"
					},
					{
						type: "Black Widow",
						coord: "H3"
					},
					{
						type: "Grave Dust",
						coord: "B3"
					},
					{
						type: "Grave Dust",
						coord: "H7"
					},
					{
						type: "Grave Dust",
						coord: "F2"
					},
					{
						type: "Grave Dust",
						coord: "D8"
					},
				],
			},
		],
	}; // End LAYOUT_DATA

	// --- Rendering Functions ---

	/**
	 * Renders pieces (Vampires, Bloodwells, Hazards) onto the game board based on game state.
	 * @param {object} gameState - The current game state object.
	 */
	function renderBoard(gameState) {
		// Clear existing pieces but not the grid squares themselves
		document.querySelectorAll(".piece").forEach((p) => p.remove());

		if (!gameState || !gameState.board) {
			console.error("Render Error: Invalid game state provided for rendering.");
			return;
		}

		// Render Vampires
		gameState.board.vampires?.forEach((vamp) => {
			const targetSquare = gameBoard.querySelector(`[data-coord="${vamp.coord}"]`);
			if (targetSquare) {
				const vampElement = document.createElement("div");
				const playerClass = gameState.players[vamp.player]?.class;
				const classColor = CLASS_DATA[playerClass]?.color || ""; // e.g., "color-sheriff"

				vampElement.classList.add("piece", "vampire", classColor);
				vampElement.dataset.id = vamp.id;
				vampElement.dataset.player = vamp.player;
				vampElement.dataset.facing = vamp.facing;
				if (vamp.id === gameState.selectedVampireId) {
					vampElement.classList.add("selected");
				}
				if (vamp.cursed) {
					vampElement.classList.add("cursed");
				}
				// Display player number (P1, P2, etc.) inside the piece
				vampElement.textContent = `P${vamp.player + 1}`;
				targetSquare.appendChild(vampElement);
			} else {
				console.warn(`Render Warning: Square not found for vampire ${vamp.id} at ${vamp.coord}`);
			}
		});

		// Render Bloodwells
		gameState.board.bloodwells?.forEach((bw) => {
			const targetSquare = gameBoard.querySelector(`[data-coord="${bw.coord}"]`);
			if (targetSquare) {
				const bwElement = document.createElement("div");
				const playerClass = gameState.players[bw.player]?.class;
				const classColor = CLASS_DATA[playerClass]?.color || ""; // e.g., "color-sheriff"

				bwElement.classList.add("piece", "bloodwell", classColor); // Use classColor for styling border via CSS
				bwElement.dataset.id = bw.id;
				bwElement.dataset.player = bw.player;
				bwElement.textContent = "🩸"; // Blood drop icon
				targetSquare.appendChild(bwElement);
			} else {
				console.warn(`Render Warning: Square not found for bloodwell ${bw.id} at ${bw.coord}`);
			}
		});

		// Render Hazards
		gameState.board.hazards?.forEach((hazard) => {
			const targetSquare = gameBoard.querySelector(`[data-coord="${hazard.coord}"]`);
			if (targetSquare) {
				const hazardElement = document.createElement("div");
				hazardElement.classList.add("piece", "hazard");
				// Correctly replace spaces with hyphens for CSS class names
				const typeClass = `hazard-${hazard.type.toLowerCase().replace(/ /g, "-")}`; // Use regex / /g for global replace
				hazardElement.classList.add(typeClass);

				let icon = "?";
				// Use correct strings without trailing spaces for comparison
				if (hazard.type === "Tombstone") icon = "🪦";
				else if (hazard.type === "Black Widow") icon = "🕷️";
				else if (hazard.type === "Grave Dust") icon = "💩";
				else if (hazard.type === "Dynamite") icon = "💥";
				hazardElement.textContent = icon;
				targetSquare.appendChild(hazardElement);
			} else {
				console.warn(`Render Warning: Square not found for hazard at ${hazard.coord}`);
			}
		});
	}

	// --- UI Update Functions ---

/**
     * Updates the detailed player info panel content (abilities, silver bullet)
     * and the state (visibility, disabled, title) of action and movement buttons.
     * Called by updateUI.
     * @param {object} player - The current player object { name, class, eliminated }
     * @param {number} turn - The current turn number (unused directly here, but context)
     * @param {number} currentAP - The current action points
     * @param {object} resources - The current player's resources { silverBullet, abilitiesUsed, ... }
     */
function updatePlayerInfoPanel(player, turn, currentAP, resources) {
	// --- Basic null checks ---
	if (!player || !resources || !currentClassAbilitiesList || !infoSilverBullet) {
		console.error("Info Panel Update Error: Missing required elements or data.");
		if (currentClassAbilitiesList) currentClassAbilitiesList.innerHTML = '<li>Error loading details</li>';
		if (infoSilverBullet) infoSilverBullet.textContent = 'Error';
		return;
	}

	// --- Update Class Details Panel (Abilities List, Silver Bullet Status) ---
	if (currentClassAbilitiesList && CLASS_DATA[player.class]?.abilities) {
		currentClassAbilitiesList.innerHTML = ''; // Clear previous list
		CLASS_DATA[player.class].abilities.forEach(ability => {
			const li = document.createElement('li');
			const isUsed = resources.abilitiesUsed.includes(ability.name);
			// Show cost only for non-passive abilities
			const apCostText = (ability.type !== 'Passive' && ability.apCost >= 0) ? ` (${ability.apCost} AP)` : '';
			// Show USED status only for 1/game Active abilities (based on description text)
			const isOneTimeActive = ability.type === 'Active' && (ability.description.includes('1/game') || ability.techDesc.includes('1/game'));
			const usedText = (isOneTimeActive && isUsed) ? ' - USED' : '';
			const displayDesc = ability.techDesc || ability.description; // Prefer techDesc if available
			li.innerHTML = `<strong>${ability.name} (${ability.type})${apCostText}${usedText}:</strong> ${displayDesc}`;
			currentClassAbilitiesList.appendChild(li);
		});
	} else if (currentClassAbilitiesList) {
		currentClassAbilitiesList.innerHTML = '<li>Ability details unavailable.</li>';
	}
	// Update Silver Bullet status display
	infoSilverBullet.textContent = resources.silverBullet > 0 ? `Available (${resources.silverBullet})` : "Used";

	// ---== Gather State for Button Updates ==---
	const selectedVamp = findVampireById(currentGameState.selectedVampireId);
	const isVampSelected = !!selectedVamp;
	const isCursed = selectedVamp?.cursed; // Check if the selected vampire is cursed
	const selectedVampClass = isVampSelected ? currentGameState.players[selectedVamp.player]?.class : null;
	const lockedVampId = currentGameState.lockedInVampireIdThisTurn;
	// Determine if the current player can control the selected vampire
	const canControlSelected = (
		isVampSelected && // Must have a vampire selected
		(player.class === 'Vigilante' || // Vigilante ignores lock-in
		 !lockedVampId || // No lock-in yet this turn
		 selectedVamp?.id === lockedVampId) // Locked into this specific vampire
	);

	// Find if there's a hazard on the selected vampire's square (for Dispel/Bite Fuse)
	let hazardOnVampSquare = null;
	if (selectedVamp) {
		hazardOnVampSquare = currentGameState.board.hazards.find((h) => h.coord === selectedVamp.coord);
	}

	// --- Update Standard Action Button States ---
	// (Assuming button consts btnShoot, etc., are defined globally)

	if (btnShoot) {
		btnShoot.style.display = "inline-block";
		// Disable conditions: No selection OR cannot control OR not enough AP OR cursed
		btnShoot.disabled = !isVampSelected || !canControlSelected || currentAP < AP_COST.SHOOT || !!isCursed;
	}

	if (btnThrow) {
		btnThrow.style.display = "inline-block";
		 // Disable conditions: No selection OR cannot control OR not enough AP (min cost) OR cursed
		btnThrow.disabled = !isVampSelected || !canControlSelected || currentAP < AP_COST.THROW_HAZARD || !!isCursed;
	}

	if (btnSilverBullet) {
		btnSilverBullet.style.display = "inline-block";
		 // Disable conditions: No selection OR cannot control OR not enough AP OR no bullet left OR cursed
		btnSilverBullet.disabled = !isVampSelected || !canControlSelected || currentAP < AP_COST.SILVER_BULLET || resources.silverBullet <= 0 || !!isCursed;
		btnSilverBullet.title = `Silver Bullet Shot (${AP_COST.SILVER_BULLET} AP)${resources.silverBullet <= 0 ? " - USED" : ""}`;
	}

	// Dispel Button (Visible only if on Grave Dust)
	const canAffordDispel = currentAP >= AP_COST.DISPEL;
	const canDispel = isVampSelected && hazardOnVampSquare?.type === "Grave Dust";
	if (btnDispel) {
		btnDispel.style.display = canDispel ? "inline-block" : "none";
		if (canDispel) { // Only set disabled state if visible
			// Disable conditions: Cannot control OR not enough AP
			btnDispel.disabled = !canControlSelected || !canAffordDispel;
			btnDispel.title = `Dispel Grave Dust (${AP_COST.DISPEL} AP)`;
		}
	}

	// Bite Fuse Button (Visible only if on Dynamite)
	const canAffordBite = currentAP >= AP_COST.BITE_FUSE;
	const canBite = isVampSelected && hazardOnVampSquare?.type === "Dynamite";
	if (btnBiteFuse) {
		btnBiteFuse.style.display = canBite ? "inline-block" : "none";
		if (canBite) { // Only set disabled state if visible
			 // Disable conditions: Cannot control OR not enough AP
			btnBiteFuse.disabled = !canControlSelected || !canAffordBite;
			btnBiteFuse.title = `Bite the Fuse (${AP_COST.BITE_FUSE} AP)`;
		}
	}

	// --- Update Class-Specific Ability Button States ---

	// Rampage Button (Outlaw Only)
	if (btnRampage) {
		const isSelectedOutlaw = selectedVampClass === 'Outlaw';
		btnRampage.style.display = isSelectedOutlaw ? 'inline-block' : 'none'; // Show only if Outlaw selected
		if (isSelectedOutlaw) {
			const rampageUsed = resources.abilitiesUsed.includes('Rampage');
			const canAffordRampage = currentAP >= AP_COST.RAMPAGE;
			 // Disable conditions: cannot control OR not enough AP OR already used OR cursed
			btnRampage.disabled = !canControlSelected || !canAffordRampage || rampageUsed || !!isCursed;
			btnRampage.title = `Rampage (${AP_COST.RAMPAGE} AP, 1/game)${rampageUsed ? ' - USED' : ''}`;
		}
	}

	// Hand Cannon Button (Outlaw Only - Placeholder logic)
	if (btnHandCannon) {
		const isSelectedOutlaw = selectedVampClass === 'Outlaw';
		btnHandCannon.style.display = isSelectedOutlaw ? 'inline-block' : 'none';
		if (isSelectedOutlaw) {
			const handCannonUsed = resources.abilitiesUsed.includes('Hand Cannon');
			const canAffordHandCannon = currentAP >= AP_COST.HAND_CANNON;
			 // Disable conditions: cannot control OR not enough AP OR already used OR cursed
			btnHandCannon.disabled = !canControlSelected || !canAffordHandCannon || handCannonUsed || !!isCursed;
			btnHandCannon.title = `Hand Cannon (${AP_COST.HAND_CANNON} AP, 1/game)${handCannonUsed ? ' - USED' : ''}`;
		}
	}

	// Contract Payoff Button (Bounty Hunter Only) - UPDATED
	if (btnContractPayoff) {
		const isSelectedBH = selectedVampClass === 'Bounty Hunter';
		btnContractPayoff.style.display = isSelectedBH ? 'inline-block' : 'none'; // Show only if BH selected
		if (isSelectedBH) {
			const abilityName = 'Contract Payoff';
			const contractUsed = resources.abilitiesUsed.includes(abilityName);
			const canAffordContract = currentAP >= AP_COST.CONTRACT_PAYOFF;
			const triggerMet = currentGameState.bwDestroyedByShotThisTurn; // <<< ADDED Check trigger flag

			// Disable conditions: Cannot control OR not enough AP OR already used OR trigger not met OR cursed
			const isDisabled = !canControlSelected || !canAffordContract || contractUsed || !triggerMet || !!isCursed;
			btnContractPayoff.disabled = isDisabled;

			// Update tooltip to be more informative
			let title = `${abilityName} (${AP_COST.CONTRACT_PAYOFF} AP, 1/game)`;
			if (contractUsed) title += ' - USED';
			else if (!triggerMet) title += ' (No BW Destroyed By Shot This Turn)';
			else if (!canControlSelected) title += ' (Cannot Control Selected)'; // Added specific reasons
			else if (!canAffordContract) title += ' (Not Enough AP)';
			else if (isCursed) title += ' (Cannot Use While Cursed)';
			btnContractPayoff.title = title;
		}
	}

	// Order Restored Button (Sheriff Only) - Verified Logic
	if (btnOrderRestored) {
		const isSelectedSheriff = selectedVampClass === 'Sheriff';
		const abilityName = 'Order Restored';
		const orderUsed = resources.abilitiesUsed.includes(abilityName);
		const canAffordOrder = currentAP >= AP_COST.ORDER_RESTORED;
		const playerIndex = currentGameState.currentPlayerIndex;

		// Check if an eliminated Sheriff ally exists
		const hasEliminatedAlly = currentGameState.eliminatedVampires?.some(
			v => v.player === playerIndex && currentGameState.players[v.player]?.class === 'Sheriff'
		) ?? false;

		// Visibility: Show only if a Sheriff is selected AND there's an ally to revive
		const isVisible = isSelectedSheriff && hasEliminatedAlly;
		btnOrderRestored.style.display = isVisible ? 'inline-block' : 'none';

		// Disabled state (only matters if visible)
		if (isVisible) {
			// Disable conditions: Cannot control OR not enough AP OR already used OR cursed
			const isDisabled = !canControlSelected || !canAffordOrder || orderUsed || !!isCursed;
			btnOrderRestored.disabled = isDisabled;
			// Update tooltip
			let title = `${abilityName} (${AP_COST.ORDER_RESTORED} AP, 1/game)`;
			 if (orderUsed) title += ' - USED';
			 else if (!canControlSelected) title += ' (Cannot Control Selected)';
			 else if (!canAffordOrder) title += ' (Not Enough AP)';
			 else if (isCursed) title += ' (Cannot Use While Cursed)';
			btnOrderRestored.title = title;
		}
	}

	// Vengeance is Mine Button (Vigilante Only) - Verified Logic
	if (btnVengeance) {
		const isSelectedVigilante = selectedVampClass === 'Vigilante';
		btnVengeance.style.display = isSelectedVigilante ? 'inline-block' : 'none'; // Show only if Vigilante selected
		if (isSelectedVigilante) {
			const abilityName = 'Vengeance is Mine';
			const vengeanceUsed = resources.abilitiesUsed.includes(abilityName);
			const wasShot = resources.wasShotSinceLastTurn; // Check the trigger flag
			const canAffordVengeance = currentAP >= AP_COST.VENGEANCE_IS_MINE; // Cost is 0

			// Disable conditions: Cannot control OR not enough AP (0) OR already used OR trigger not met OR cursed
			const isDisabled = !canControlSelected || !canAffordVengeance || vengeanceUsed || !wasShot || !!isCursed;
			btnVengeance.disabled = isDisabled;

			// Update tooltip
			let title = `${abilityName} (${AP_COST.VENGEANCE_IS_MINE} AP, 1/game)`;
			if (vengeanceUsed) title += ' - USED';
			else if (!wasShot) title += ' (Ally Not Shot Recently)';
			else if (!canControlSelected) title += ' (Cannot Control Selected)';
			else if (isCursed) title += ' (Cannot Use While Cursed)';
			btnVengeance.title = title;
		}
	}


	// --- Movement Buttons Visibility & State ---
	if (movementBar) {
		if (!isVampSelected) {
			movementBar.classList.add('hidden');
		} else {
			movementBar.classList.remove('hidden');
			// Logic for enabling/disabling based on Swift Justice or normal turn
			if (isSwiftJusticeMovePending) {
				// Force enabled during SJ move selection
				if (btnMoveN) btnMoveN.disabled = false;
				if (btnMoveE) btnMoveE.disabled = false;
				if (btnMoveS) btnMoveS.disabled = false;
				if (btnMoveW) btnMoveW.disabled = false;
			} else {
				// Normal turn movement/pivot logic
				const canAffordMoveOrPivot = currentAP >= AP_COST.MOVE; // Cost is same for move/pivot
				const movesTakenThisTurn = selectedVamp?.movesThisTurn || 0;
				const canMoveForward = !isCursed || movesTakenThisTurn < 1; // Cursed only allow 1 move action

				// Disable Move Forward if cannot afford, cannot control, OR if cursed and already moved
				if (btnMoveN) btnMoveN.disabled = !canControlSelected || !canAffordMoveOrPivot || (selectedVamp?.facing === 'N' && !canMoveForward);
				if (btnMoveE) btnMoveE.disabled = !canControlSelected || !canAffordMoveOrPivot || (selectedVamp?.facing === 'E' && !canMoveForward);
				if (btnMoveS) btnMoveS.disabled = !canControlSelected || !canAffordMoveOrPivot || (selectedVamp?.facing === 'S' && !canMoveForward);
				if (btnMoveW) btnMoveW.disabled = !canControlSelected || !canAffordMoveOrPivot || (selectedVamp?.facing === 'W' && !canMoveForward);

				// Ensure PIVOT buttons (those NOT matching facing) are only disabled if cannot afford or control
				// (Cursed status doesn't prevent pivoting)
				if (selectedVamp?.facing !== 'N' && btnMoveN) btnMoveN.disabled = !canControlSelected || !canAffordMoveOrPivot;
				if (selectedVamp?.facing !== 'E' && btnMoveE) btnMoveE.disabled = !canControlSelected || !canAffordMoveOrPivot;
				if (selectedVamp?.facing !== 'S' && btnMoveS) btnMoveS.disabled = !canControlSelected || !canAffordMoveOrPivot;
				if (selectedVamp?.facing !== 'W' && btnMoveW) btnMoveW.disabled = !canControlSelected || !canAffordMoveOrPivot;
			}
		}
	} else {
		console.warn("Movement bar element not found.");
	}

} // End of updatePlayerInfoPanel

	/**
	 * Main UI update function, called after actions or turn changes.
	 * Fetches current player data, updates status bar, and calls the panel update function.
	 */
	function updateUI() {
		// 1. --- Basic Check for Valid Game State ---
		if (
			!currentGameState?.players?.length ||
			!currentGameState.playerResources?.length ||
			currentGameState.currentPlayerIndex === null ||
			typeof currentGameState.currentPlayerIndex === "undefined"
		) {
			console.warn("updateUI called with invalid game state.");
			const statusBarElement = document.getElementById("status-bar");
			if (statusBarElement) {
				statusBarElement.textContent = "Waiting for game...";
				statusBarElement.className = 'status-bar';
				statusBarElement.style.backgroundColor = "";
				statusBarElement.style.color = "";
			}
			return;
		}

		// 2. --- Get Current Player Data ---
		const idx = currentGameState.currentPlayerIndex;
		if (idx < 0 || idx >= currentGameState.players.length || idx >= currentGameState.playerResources.length) {
			console.error("updateUI Error: Invalid currentPlayerIndex:", idx);
			return;
		}
		const player = currentGameState.players[idx];
		const resources = currentGameState.playerResources[idx];
		const currentAP = currentGameState.currentAP;
		const currentTurn = currentGameState.turn;
		if (!player || !resources) {
			console.error("updateUI Error: Could not fetch player or resources for index", idx);
			return;
		}

		// 3. --- Update Status Bar ---
		const statusBarElement = document.getElementById("status-bar");
		if (statusBarElement) {
			const playerClass = player.class;
			const classLower = playerClass?.toLowerCase();
			// Update background/text color based on class
			statusBarElement.classList.remove('color-sheriff', 'color-vigilante', 'color-outlaw', 'color-bounty-hunter');
			if (classLower) {
                // Replace spaces with hyphens to create a valid CSS class name
                const validClassName = `color-${classLower.replace(/ /g, '-')}`;
                statusBarElement.classList.add(validClassName); // <--- FIXED LINE
            }
			// Update text content to include Class Name and AP
			const turnText = playerClass ? `${playerClass}'s Turn` : "Unknown Player's Turn";
			statusBarElement.innerHTML = `${turnText} | AP: <span id="status-ap-display">${currentAP}</span>`;
		} else {
			console.warn("Status bar element (#status-bar) not found.");
		}

		// 4. --- Update Detailed Player Info Panel & Buttons ---
		updatePlayerInfoPanel(player, currentTurn, currentAP, resources);

		// 5. --- Render the Game Board ---
		renderBoard(currentGameState);

		// 6. --- Update Undo Button State ---
		const btnUndo = document.getElementById('btn-undo');
		if (btnUndo) btnUndo.disabled = gameHistory.length === 0;

		// 7. --- Update Selected Vampire Visual Highlight ---
		document.querySelectorAll('.grid-square .vampire.selected').forEach(el => el.classList.remove('selected'));
		if (currentGameState.selectedVampireId) {
			const selectedElement = document.querySelector(`.vampire[data-id="${currentGameState.selectedVampireId}"]`);
			if (selectedElement) {
				selectedElement.classList.add('selected');
			}
		}
	} // --- End of updateUI function ---

	// --- Game State & Undo Logic ---
	function saveStateToHistory() {
		try {
			// Use structuredClone for a more robust deep copy if available, otherwise fallback to JSON
			if (typeof structuredClone === 'function') {
				gameHistory.push(structuredClone(currentGameState));
			} else {
				gameHistory.push(JSON.parse(JSON.stringify(currentGameState)));
			}
			if (btnUndo) btnUndo.disabled = false;
			console.log("State saved. History depth:", gameHistory.length);
		} catch (error) {
			console.error("Error saving state to history:", error);
			alert("Undo Error! Could not save previous state.");
		}
	}

	function undoLastAction() {
		if (gameHistory.length > 0) {
			console.log("Undoing last action...");
			try {
				currentGameState = gameHistory.pop(); // Restore previous state
				// Re-render and update UI based on restored state
				renderBoard(currentGameState);
				updateUI();
				addToLog("--- Action Undone ---");
				if (btnUndo) btnUndo.disabled = gameHistory.length === 0; // Disable if history is now empty
			} catch (error) {
				console.error("Error restoring state from history:", error);
				alert("Undo Restore Error! State might be corrupted.");
				if (btnUndo) btnUndo.disabled = true; // Disable undo if error occurs
			}
		} else {
			console.log("Nothing to undo.");
			if (btnUndo) btnUndo.disabled = true;
		}
	}

	// --- Find Pieces ---
	function findVampireById(vampId) {
		if (!vampId || !currentGameState?.board?.vampires) return null;
		return currentGameState.board.vampires.find((v) => v.id === vampId);
	}

	function findPieceAtCoord(coord) {
		if (!coord || !currentGameState?.board) return null;

		// Check vampires first (more common interactable)
		const vamp = currentGameState.board.vampires?.find((v) => v.coord === coord);
		if (vamp) return {
			type: "vampire",
			piece: vamp
		};

		// Check bloodwells
		const bw = currentGameState.board.bloodwells?.find((b) => b.coord === coord);
		if (bw) return {
			type: "bloodwell",
			piece: bw
		};

		// Check hazards
		const hazard = currentGameState.board.hazards?.find((h) => h.coord === coord);
		if (hazard) return {
			type: "hazard",
			piece: hazard
		};

		return null; // Nothing found at the coordinate
	}

	/**
     * Applies the Cursed status effect to a vampire.
     * @param {object} targetVamp - The vampire object in the current game state to curse.
     */
    function applyCurse(targetVamp) {
        if (targetVamp && !targetVamp.cursed) {
            targetVamp.cursed = true;
            targetVamp.movesThisTurn = 0; // Reset moves when cursed
            addToLog(`${targetVamp.id} is now CURSED!`);
            return true; // Indicate curse was applied
        }
        return false; // Already cursed or invalid target
    }

    /**
     * Highlights valid squares for placing a revived Sheriff via Order Restored.
     * Valid squares are empty and adjacent to the activating Sheriff OR any friendly Bloodwell.
     * @param {object} activatingVamp - The Sheriff vampire using the ability.
     */
    function highlightOrderRestoredTargets(activatingVamp) {
        clearHighlights();
        const validTargetCoords = new Set();
        const playerIndex = activatingVamp.player;

        // Get coords adjacent to the activating Sheriff
        const adjacentToVamp = getAllAdjacentCoords(activatingVamp.coord);
        adjacentToVamp.forEach(coord => validTargetCoords.add(coord));

        // Get coords adjacent to all friendly Bloodwells
        currentGameState.board.bloodwells.forEach(bw => {
            if (bw.player === playerIndex) {
                const adjacentToBW = getAllAdjacentCoords(bw.coord);
                adjacentToBW.forEach(coord => validTargetCoords.add(coord));
            }
        });

        let foundValidSquare = false;
        // Highlight valid coordinates IF they are empty
        validTargetCoords.forEach(coord => {
            const piece = findPieceAtCoord(coord);
            const squareElement = gameBoard.querySelector(`.grid-square[data-coord="${coord}"]`);
            if (squareElement) {
                if (!piece) { // Must be empty
                    squareElement.classList.add('valid-target');
                    foundValidSquare = true;
                } else {
                    // Optional: Mark occupied squares as invalid explicitly?
                    // squareElement.classList.add('invalid-target');
                }
            }
        });

        if (!foundValidSquare) {
             addToLog("No valid empty squares adjacent to Sheriff or Bloodwells to revive.");
             // Auto-cancel the pending action if no targets?
             currentGameState.actionState.pendingAction = null;
             currentGameState.actionState.selectedAbility = null; // Clear ability selection
             updateUI(); // Refresh button states
        } else {
            addToLog("Select highlighted square to revive Sheriff.");
        }
    }

	// --- Batch 3 Ends Here ---
	// Next batch will start with Action Execution functions (executeMove, executePivot, etc.).
	// --- Action Execution Functions ---

/**
     * Executes a Shoot action (standard or Silver Bullet).
     * Handles path tracing, hitting pieces/hazards, and applying effects including passives.
     * @param {object} vampire - The vampire object shooting.
     * @param {boolean} [isSilverBullet=false] - If true, performs Silver Bullet logic.
     * @param {string | null} [overrideFacing=null] - Optional facing for abilities like Rampage.
     * @param {number | null} [apCostOverride=null] - Optional AP cost for ability sub-shots (e.g., 0).
     * @returns {boolean} - True if the shot attempt occurred, false otherwise.
     */
function executeShoot(vampire, isSilverBullet = false, overrideFacing = null, apCostOverride = null) {
	if (!vampire) {
		console.error("executeShoot: Missing vampire object.");
		return false;
	}

	const cost = apCostOverride ?? (isSilverBullet ? AP_COST.SILVER_BULLET : AP_COST.SHOOT);
	const playerIndex = vampire.player;
	const playerResources = currentGameState.playerResources[playerIndex];

	// --- Validation ---
	if (apCostOverride === null && currentGameState.currentAP < cost) { // Check AP only if not an override
		addToLog(`Not enough AP to Shoot (Need ${cost}, Have ${currentGameState.currentAP}).`);
		return false;
	}
	if (vampire.cursed) {
		addToLog("Cursed vampires cannot shoot.");
		return false;
	}
	if (isSilverBullet && (playerResources.silverBullet <= 0)) {
		addToLog("No Silver Bullet available.");
		return false;
	}

	// --- Lock-in, Resource Deduction & State Tracking (only for player-initiated actions) ---
	let historySaved = false; // Track if we saved state for potential undo
	if (apCostOverride === null) {
		const currentPlayerClass = currentGameState.players[currentGameState.currentPlayerIndex].class;
		if (currentPlayerClass !== 'Vigilante' && !currentGameState.lockedInVampireIdThisTurn) {
			currentGameState.lockedInVampireIdThisTurn = vampire.id;
			addToLog(`Locked into controlling ${vampire.id} for the rest of the turn.`);
		}
		currentGameState.lastActionVampId = vampire.id;

		saveStateToHistory(); // Save state before the action resolves
		historySaved = true; // Mark state saved

		currentGameState.currentAP -= cost; // Deduct AP
		if (isSilverBullet) {
			playerResources.silverBullet--; // Use Silver Bullet
		}
		// Reset BW destruction flag at start of a new *player-initiated* shot action
		currentGameState.bwDestroyedByShotThisTurn = false;
	} // else: Don't save/deduct AP/reset flags for ability sub-shots like Rampage

	// --- Prepare Shot ---
	const shooterClass = currentGameState.players[playerIndex].class;
	const facingToUse = overrideFacing || vampire.facing;
	let currentCoord = vampire.coord;
	let hitMessage = `Shot from ${vampire.coord} facing ${facingToUse} went off board.`;
	let shotResolved = false;
	let needsEliminationCheck = false;
	let shotHitOwnVampireFlag = false; // Flag for Vengeance trigger
	let targetPieceHit = null; // Store the piece that was hit for Vengeance tracking
	let targetType = null;     // Declare targetType and targetPiece here
	let targetPiece = null;    // to ensure they are accessible for Vengeance check

	addToLog(`${vampire.id} shoots facing ${facingToUse}${isSilverBullet ? ' (Silver Bullet)' : ''}${apCostOverride !== null ? ' (Ability)' : ''}...`);

	// --- Trace Shot Path ---
	for (let i = 0; i < 9 && !shotResolved; i++) { // Max 9 squares range
		const nextCoord = getAdjacentCoord(currentCoord, facingToUse);
		if (!nextCoord) {
			shotResolved = true; // Hit board edge
			break;
		}
		currentCoord = nextCoord;
		const pieceAtCoord = findPieceAtCoord(currentCoord);

		if (pieceAtCoord) {
			targetType = pieceAtCoord.type; // Assign type when a piece is found
			targetPiece = pieceAtCoord.piece; // Assign piece when found
			targetPieceHit = targetPiece; // Store the reference

			// --- Hazard Interactions ---
			if (targetType === "hazard") {
				if (targetPiece.type === "Tombstone") {
					const isSharpshooter = shooterClass === "Bounty Hunter";
					if (isSharpshooter) {
						addToLog(`Shot passes through Tombstone at ${currentCoord} (Sharpshooter).`);
						continue; // Shot continues
					} else {
						hitMessage = `Shot DESTROYED Tombstone at ${currentCoord}!`;
						if (isSilverBullet) hitMessage = `Silver Bullet shattered Tombstone at ${currentCoord} (Shot Blocked)!`;
						returnHazardToPool("Tombstone");
						currentGameState.board.hazards = currentGameState.board.hazards.filter(h => h.coord !== currentCoord);
						shotResolved = true;
					}
				} else if (targetPiece.type === "Dynamite") {
					hitMessage = `Shot hit Dynamite at ${currentCoord}! BOOM!`;
					shotResolved = true;
					console.log(`Dynamite hit by shot at ${currentCoord}. Initiating explosion.`);
					addToLog(`Shot triggers Dynamite at ${currentCoord}!`);
					const explosionQueue = [currentCoord];
					const processedExplosions = new Set();
					returnHazardToPool("Dynamite");
					currentGameState.board.hazards = currentGameState.board.hazards.filter(h => h.coord !== currentCoord);
					processExplosionQueue(explosionQueue, processedExplosions); // This handles chains & UI update
				} else if (targetPiece.type === "Black Widow") {
					hitMessage = `Shot destroyed Black Widow at ${currentCoord}!`;
					returnHazardToPool("Black Widow");
					currentGameState.board.hazards = currentGameState.board.hazards.filter(h => h.coord !== currentCoord);
					shotResolved = true;
				} else if (targetPiece.type === "Grave Dust") {
					addToLog(`Shot passes through Grave Dust at ${currentCoord}.`);
					continue;
				}
			}
			// --- Piece Interactions ---
			else if (targetType === 'vampire') {
				const targetVampInState = findVampireById(targetPiece.id); // Get reference

				if (targetPiece.player !== playerIndex) { // --- Hit an ENEMY vampire ---
					if (isSilverBullet) {
						hitMessage = `Silver Bullet HIT & ELIMINATED enemy ${targetPiece.id} at ${currentCoord}!`;
						addToLog(hitMessage);
						if (targetVampInState) currentGameState.eliminatedVampires.push(JSON.parse(JSON.stringify(targetVampInState)));
						currentGameState.board.vampires = currentGameState.board.vampires.filter(v => v.id !== targetPiece.id);
						needsEliminationCheck = true;
					} else {
						 // Marked Man (Bounty Hunter) Passive Check - Apply Curse
						 let curseApplied = false;
						 if (shooterClass === 'Bounty Hunter' && targetVampInState) {
							curseApplied = applyCurse(targetVampInState); // Use helper
						 }
						 hitMessage = `Shot HIT enemy ${targetPiece.id} at ${currentCoord}.${curseApplied ? ' Target CURSED!' : ''}`;
					}
				} else { // --- Hit an ALLY vampire ---
					hitMessage = `Shot hit ally ${targetPiece.id} at ${currentCoord}.`;
					shotHitOwnVampireFlag = true; // Set flag for Vengeance check later
				}
				shotResolved = true; // Shot always stops on hitting a vampire
			} else if (targetType === 'bloodwell') {
				const targetBWPlayerIndex = targetPiece.player;
				let isProtected = false;
				// Check Sheriff Protection (only for standard shots)
				if (!isSilverBullet) {
					const ownerPlayer = currentGameState.players[targetBWPlayerIndex];
					if (ownerPlayer?.class === 'Sheriff' && !ownerPlayer.eliminated) {
						const activeSheriffVamps = currentGameState.board.vampires.filter(v => v.player === targetBWPlayerIndex);
						for (const sheriffVamp of activeSheriffVamps) {
							const protectionZone = getCoordsInArea(sheriffVamp.coord, 1);
							if (protectionZone.includes(targetPiece.coord)) {
								isProtected = true;
								break;
							}
						}
					}
				}

				if (isProtected) {
					 hitMessage = `Shot blocked! Sheriff's Bloodwell at ${targetPiece.coord} is protected!`;
					 addToLog(hitMessage);
				} else {
					// Destroy Bloodwell
					hitMessage = `Shot DESTROYED Bloodwell ${targetPiece.id} at ${targetPiece.coord}!`;
					addToLog(hitMessage);
					currentGameState.board.bloodwells = currentGameState.board.bloodwells.filter(bw => bw.id !== targetPiece.id);
					needsEliminationCheck = true;

					// --- Trigger Checks for Abilities ---
					// Set flag for Contract Payoff check later this turn (if shooter is BH & player action)
					if (apCostOverride === null && shooterClass === 'Bounty Hunter') {
						currentGameState.bwDestroyedByShotThisTurn = true;
						console.log("BW destroyed by shot, enabling Contract Payoff option.");
					}
					// TODO: Trigger Daring Escape check if shooter is Outlaw and it was an ENEMY BW
					// if (apCostOverride === null && shooterClass === 'Outlaw' && targetBWPlayerIndex !== playerIndex) { ... }
				}
				shotResolved = true; // Shot stops on hitting bloodwell
			}
		} // End if(pieceAtCoord)

		if (shotResolved) break; // Exit loop if shot resolved
	} // End for loop (shot path)

	// --- Final Logging & Updates ---
	const requiresFinalUpdate = apCostOverride === null && !hitMessage.includes("Dynamite"); // Don't update if ability sub-call or explosion handles it

	if (requiresFinalUpdate) { // Log final outcome only if explosion didn't happen
		 const finalLogAPMsg = ` (${currentGameState.currentAP} AP left)`;
		 addToLog(hitMessage + finalLogAPMsg);
	}

	// --- Vengeance is Mine Trigger Check ---
	// Check if an ally vampire was hit by a player-initiated shot
	// Use targetPieceHit reference stored during the loop
	if (shotHitOwnVampireFlag && apCostOverride === null && targetPieceHit && targetPieceHit.type === 'vampire') {
		 const allyPlayerIndex = targetPieceHit.player; // Get index of the player whose vamp was hit
		 if (currentGameState.playerResources[allyPlayerIndex]) {
			  currentGameState.playerResources[allyPlayerIndex].wasShotSinceLastTurn = true;
			  console.log(`Vengeance trigger: P${allyPlayerIndex + 1}'s vampire (${targetPieceHit.id}) was shot.`);
		 }
	}


	// --- Post-Action Updates (Elimination, Game End, UI Refresh) ---
	if (requiresFinalUpdate) { // Only perform these if not handled by explosion queue
		let gameEnded = false;
		if (needsEliminationCheck) {
			 console.log("Checking elimination status after shot resolution.");
			 const newlyEliminatedIndexes = new Set();
			 for (let i = 0; i < currentGameState.players.length; i++) {
				 // Check only players not already known to be eliminated
				 if (!currentGameState.players[i].eliminated && checkPlayerElimination(i)) {
					 if (updateEliminationState(i)) {
						  newlyEliminatedIndexes.add(i);
					 }
				 }
			 }
			 gameEnded = checkGameEnd(); // Check for winner AFTER processing eliminations
			 if (gameEnded) {
				  if (historySaved) { // Invalidate undo if game ended
					   gameHistory = [];
					   if(btnUndo) btnUndo.disabled = true;
				  }
				  // Don't show elimination popups if game ended, victory popup handles it
			 } else {
				 // Show popups only if game continues for newly eliminated players
				 newlyEliminatedIndexes.forEach(eliminatedIndex => {
					showEliminationPopup(eliminatedIndex);
				 });
			 }
		}
		// Re-render board state and update UI only if game hasn't ended and explosion didn't handle it
		if (!gameEnded) {
			renderBoard(currentGameState);
			updateUI();
		}
	}

	return true; // Indicate shot attempt occurred
}

	/**
	 * Executes a Pivot action for the selected vampire.
	 * @param {object} vampire - The vampire object performing the pivot.
	 * @param {string} newFacing - The new direction ("N", "E", "S", "W").
	 * @returns {boolean} - True if the pivot was successful, false otherwise.
	 */
	function executePivot(vampire, newFacing) {
		if (!vampire) {
			console.error("executePivot: Missing vampire object.");
			return false;
		}
		if (!DIRECTIONS.includes(newFacing)) {
			console.error(`executePivot: Invalid facing direction "${newFacing}".`);
			return false;
		}

		const cost = AP_COST.PIVOT;
		if (currentGameState.currentAP < cost) {
			addToLog("Not enough AP to Pivot.");
			return false;
		}

		// --- Lock-in & Last Action Tracking ---
		const currentPlayerClass = currentGameState.players[currentGameState.currentPlayerIndex].class;
		if (currentPlayerClass !== "Vigilante" && !currentGameState.lockedInVampireIdThisTurn) {
			currentGameState.lockedInVampireIdThisTurn = vampire.id;
			addToLog(`Locked into controlling ${vampire.id} for the rest of the turn.`);
		}
		currentGameState.lastActionVampId = vampire.id;
		// --- End Lock-in ---

		// --- Action is valid, proceed ---
		saveStateToHistory();

		// Find the vampire *in the current state* to modify
		const vampInState = findVampireById(vampire.id);
		if (!vampInState) {
			console.error(`executePivot Error: Could not find vampire ${vampire.id} in current state!`);
			undoLastAction(); // Revert history save
			return false;
		}

		// Update state
		vampInState.facing = newFacing;
		currentGameState.currentAP -= cost;

		addToLog(`${vampInState.id} pivoted to face ${newFacing}. (${currentGameState.currentAP} AP left)`);

		// Update display
		renderBoard(currentGameState);
		updateUI();
		return true;
	}

	/**
     * Executes a Throw Hazard action after validation.
     * Assumes targetCoord is valid based on prior highlighting.
     * Updates game state (pool, board, AP) and UI.
     * @param {object} vampire - The vampire object throwing.
     * @param {string} hazardType - The type of hazard ("Tombstone", "Black Widow", etc.).
     * @param {string} targetCoord - The coordinate to throw to.
     * @returns {boolean} - True if successful, false otherwise.
     */
    function executeThrow(vampire, hazardType, targetCoord) {
        // --- Initial Checks ---
        if (!vampire) {
            console.error("executeThrow: Missing vampire object.");
            return false;
        }

        const cost = hazardType === "Dynamite" ? AP_COST.THROW_DYNAMITE : AP_COST.THROW_HAZARD;

        // --- REMOVED the misplaced emoji and button creation code ---

        // Check AP
        if (currentGameState.currentAP < cost) {
            addToLog(`Not enough AP to Throw ${hazardType}.`);
            return false;
        }
        // Check Cursed Status
        if (vampire.cursed) {
            addToLog("Cursed vampires cannot throw hazards.");
            return false;
        }
        // Check Hazard Pool Availability (Ensure this line is exactly like this in your file)
        if (!currentGameState.hazardPool || (currentGameState.hazardPool[hazardType] || 0) <= 0) {
            addToLog(`No ${hazardType}s left in the pool.`);
            return false;
        }

        // --- Lock-in & Last Action Tracking ---
        const currentPlayerClass = currentGameState.players[currentGameState.currentPlayerIndex].class;
        if (currentPlayerClass !== "Vigilante" && !currentGameState.lockedInVampireIdThisTurn) {
            currentGameState.lockedInVampireIdThisTurn = vampire.id;
            addToLog(`Locked into controlling ${vampire.id} for the rest of the turn.`);
        }
        currentGameState.lastActionVampId = vampire.id;
        // --- End Lock-in ---

        // --- Action is valid, proceed ---
        saveStateToHistory();

        // --- Update Game State ---
        currentGameState.hazardPool[hazardType]--; // Decrement from pool
        currentGameState.board.hazards.push({    // Add hazard to board
            type: hazardType,
            coord: targetCoord,
        });
        currentGameState.currentAP -= cost;       // Deduct AP

        addToLog(`${vampire.id} threw ${hazardType} to ${targetCoord}. (${currentGameState.currentAP} AP left)`);

        // --- Post-Throw Effects (e.g., Grave Dust curse) ---
        if (hazardType === "Grave Dust") {
            const pieceAtTarget = findPieceAtCoord(targetCoord);
            if (pieceAtTarget?.type === "vampire") {
                const targetVamp = findVampireById(pieceAtTarget.piece.id);
                if (targetVamp && !targetVamp.cursed) {
                    targetVamp.cursed = true;
                    targetVamp.movesThisTurn = 0; // Reset moves on curse
                    addToLog(`${targetVamp.id} was hit by Grave Dust and is CURSED!`);
                }
            }
        }

        // --- Update Display ---
        renderBoard(currentGameState);
        updateUI();
        return true; // Indicate successful execution
    }

	/**
	 * Executes the Dispel action: Removes Grave Dust from the vampire's current square.
	 * @param {object} vampire - The vampire object performing the action.
	 * @returns {boolean} - True if successful, false otherwise.
	 */
	function executeDispel(vampire) {
		if (!vampire) {
			console.error("executeDispel: Missing vampire object.");
			return false;
		}
		const cost = AP_COST.DISPEL;

		// --- Lock-in & Last Action Tracking ---
		const currentPlayerClass = currentGameState.players[currentGameState.currentPlayerIndex].class;
		if (currentPlayerClass !== "Vigilante" && !currentGameState.lockedInVampireIdThisTurn) {
			currentGameState.lockedInVampireIdThisTurn = vampire.id;
			addToLog(`Locked into controlling ${vampire.id} for the rest of the turn.`);
		}
		currentGameState.lastActionVampId = vampire.id;
		// --- End Lock-in ---

		// Check AP (Moved lock-in above AP check)
		if (currentGameState.currentAP < cost) {
			addToLog("Not enough AP to Dispel.");
			return false;
		}

		// Find Grave Dust hazard on the vampire's current square (Corrected string)
		const hazardIndex = currentGameState.board.hazards.findIndex(
			(h) => h.coord === vampire.coord && h.type === "Grave Dust" // No trailing space
		);

		if (hazardIndex === -1) {
			addToLog(`Cannot Dispel: No Grave Dust found at ${vampire.coord}.`);
			// Don't charge AP if condition not met
			return false;
		}

		// --- Action is Valid: Proceed ---
		saveStateToHistory();

		// Remove the hazard
		const removedHazard = currentGameState.board.hazards.splice(hazardIndex, 1)[0];
        if (removedHazard) { // Check splice worked
            returnHazardToPool(removedHazard.type); // <<< ADD THIS (Should be "Grave Dust")
            console.log("Dispelled hazard:", removedHazard.type);
        }
		console.log("Dispelled hazard:", removedHazard?.type);

		// Deduct AP
		currentGameState.currentAP -= cost;

		addToLog(`${vampire.id} Dispelled Grave Dust at ${vampire.coord}. (${currentGameState.currentAP} AP left)`);

		// Update display
		renderBoard(currentGameState);
		updateUI();
		return true;
	}

	/**
	 * Executes the Bite the Fuse action: Removes Dynamite, Curses the vampire.
	 * @param {object} vampire - The vampire object performing the action.
	 * @returns {boolean} - True if successful, false otherwise.
	 */
	function executeBiteFuse(vampire) {
		if (!vampire) {
			console.error("executeBiteFuse: Missing vampire object.");
			return false;
		}
		const cost = AP_COST.BITE_FUSE;

		// --- Lock-in & Last Action Tracking ---
		const currentPlayerClass = currentGameState.players[currentGameState.currentPlayerIndex].class;
		if (currentPlayerClass !== "Vigilante" && !currentGameState.lockedInVampireIdThisTurn) {
			currentGameState.lockedInVampireIdThisTurn = vampire.id;
			addToLog(`Locked into controlling ${vampire.id} for the rest of the turn.`);
		}
		currentGameState.lastActionVampId = vampire.id;
		// --- End Lock-in ---

		// Check AP
		if (currentGameState.currentAP < cost) {
			addToLog("Not enough AP to Bite the Fuse.");
			return false;
		}

		// Find Dynamite hazard on the vampire's current square (Corrected string)
		const hazardIndex = currentGameState.board.hazards.findIndex(
			(h) => h.coord === vampire.coord && h.type === "Dynamite" // No trailing space
		);

		if (hazardIndex === -1) {
			addToLog(`Cannot Bite the Fuse: No Dynamite found at ${vampire.coord}.`);
			// Don't charge AP if condition not met
			return false;
		}

		// --- Action is Valid: Proceed ---
		saveStateToHistory();

		// Find the vampire *in state* to modify
		const vampInState = findVampireById(vampire.id);
		if (!vampInState) {
			console.error(`executeBiteFuse Error: Could not find vampire ${vampire.id} in current state!`);
			undoLastAction(); // Revert history save
			return false;
		}

		// Remove the Dynamite
		const removedHazard = currentGameState.board.hazards.splice(hazardIndex, 1)[0];
        if (removedHazard) { // Check splice worked
            returnHazardToPool(removedHazard.type); // <<< ADD THIS (Should be "Dynamite")
            console.log("Removed hazard by biting fuse:", removedHazard.type);
        }
		console.log("Removed hazard by biting fuse:", removedHazard?.type);

		// Deduct AP
		currentGameState.currentAP -= cost;

		// Apply Curse
		vampInState.cursed = true;
		vampInState.movesThisTurn = 0; // Reset move counter upon becoming cursed

		addToLog(`${vampInState.id} Bit the Fuse at ${vampInState.coord}, removing Dynamite and becoming CURSED! (${currentGameState.currentAP} AP left)`);

		// Update display
		renderBoard(currentGameState);
		updateUI();
		return true;
	}

/**
     * Executes the Sheriff's Order Restored ability (initiates targeting).
     * Checks conditions and sets up the game state for target square selection.
     * @param {object} sheriffVamp - The Sheriff vampire initiating the revival.
     * @returns {boolean} - True if targeting successfully initiated, false otherwise.
     */
function executeOrderRestored(sheriffVamp) {
	// --- Validation ---
	if (!sheriffVamp || currentGameState.players[sheriffVamp.player]?.class !== 'Sheriff') {
		console.error("executeOrderRestored: Invalid activating vampire.");
		return false;
	}

	const cost = AP_COST.ORDER_RESTORED;
	const abilityName = 'Order Restored';
	const playerIndex = sheriffVamp.player;
	const playerResources = currentGameState.playerResources[playerIndex];

	if (currentGameState.currentAP < cost) {
		addToLog(`Not enough AP for ${abilityName}. Need ${cost}, have ${currentGameState.currentAP}.`);
		return false;
	}
	if (playerResources.abilitiesUsed.includes(abilityName)) {
		addToLog(`${abilityName} already used this game.`);
		return false;
	}
	if (sheriffVamp.cursed) {
		addToLog(`Cannot use ${abilityName} while cursed.`);
		return false;
	}
	// Check if there's an eliminated Sheriff of the current player to revive
	const eliminatedSheriff = currentGameState.eliminatedVampires.find(
		 ev => ev.player === playerIndex && currentGameState.players[ev.player]?.class === 'Sheriff'
	);
	if (!eliminatedSheriff) {
		addToLog(`No eliminated Sheriffs available to revive.`);
		// Disable button state should ideally prevent this, but double-check
		return false;
	}

	// --- Initiate Targeting ---
	// Note: State is saved in handleBoardClick AFTER target selection is confirmed.
	currentGameState.actionState.pendingAction = 'order-restored-select-target';
	currentGameState.actionState.selectedAbility = abilityName;
	// Store needed info for resolution after click
	currentGameState.actionState.abilityTargetData = {
		 activatingVampId: sheriffVamp.id,
		 reviveVampId: eliminatedSheriff.id // Store ID of the specific vamp to revive
		 // We only support reviving one at a time, find finds the first. If multiple were possible, UI would need selection.
	};

	// Highlight potential squares and check if any are valid
	highlightOrderRestoredTargets(sheriffVamp); // This function handles logging for target selection or lack thereof

	// Check if the highlighter found any targets; if not, it should reset the action state itself.
	// Assuming highlighter works correctly, we don't need an extra check here.

	return true; // Indicate targeting started (or potentially failed if highlighter found no spots)
}

/**
 * Executes the Vigilante's Vengeance is Mine ability.
 * Checks conditions, saves state, sets the AP bonus flag for the next turn, and updates UI.
 * @param {object} vigilanteVamp - The Vigilante vampire using the ability.
 * @returns {boolean} - True if action successful, false otherwise.
 */
function executeVengeanceIsMine(vigilanteVamp) {
	 // --- Validation ---
	 if (!vigilanteVamp || currentGameState.players[vigilanteVamp.player]?.class !== 'Vigilante') {
		console.error("executeVengeanceIsMine: Invalid activating vampire.");
		return false;
	 }

	 const cost = AP_COST.VENGEANCE_IS_MINE; // Should be 0
	 const abilityName = 'Vengeance is Mine';
	 const playerIndex = vigilanteVamp.player;
	 const playerResources = currentGameState.playerResources[playerIndex];

	 if (currentGameState.currentAP < cost) { // Check even if 0, for consistency
		 addToLog(`Not enough AP for ${abilityName}. Need ${cost}, have ${currentGameState.currentAP}.`);
		 return false;
	 }
	 if (playerResources.abilitiesUsed.includes(abilityName)) {
		 addToLog(`${abilityName} already used this game.`);
		 return false;
	 }
	 // Check the trigger condition: Was an owned vampire shot since last turn?
	 if (!playerResources.wasShotSinceLastTurn) {
		 addToLog(`Cannot use ${abilityName}: No owned vampire was shot since your last turn.`);
		 return false;
	 }
	 // Cannot use if cursed? Assumed yes.
	 if (vigilanteVamp.cursed) {
		 addToLog(`Cannot use ${abilityName} while cursed.`);
		 return false;
	 }

	 // --- Action Valid - Execute ---
	 saveStateToHistory(); // Save state before applying effects

	 // Set bonus flag for next turn
	 playerResources.vengeanceNextTurnBonus = 7; // The specified bonus AP
	 playerResources.abilitiesUsed.push(abilityName); // Mark ability as used
	 currentGameState.currentAP -= cost; // Deduct AP (should be 0)

	  // Lock-in logic (important even for 0 AP actions to potentially lock the player in)
	 const currentPlayerClass = currentGameState.players[playerIndex].class; // Should be Vigilante, but check anyway
	 if (currentPlayerClass !== 'Vigilante' && !currentGameState.lockedInVampireIdThisTurn) {
		 currentGameState.lockedInVampireIdThisTurn = vigilanteVamp.id;
		 addToLog(`Locked into controlling ${vigilanteVamp.id} for the rest of the turn.`);
	 }
	 // Update last action vamp ID
	 currentGameState.lastActionVampId = vigilanteVamp.id;

	 addToLog(`${vigilanteVamp.id} activates ${abilityName}! +7 AP next turn. (${currentGameState.currentAP} AP left)`);

	 updateUI(); // Update UI to reflect AP change (if any) and ability used status
	 return true; // Action successful
}

 /**
 * Executes the Bounty Hunter's Contract Payoff ability.
 * Checks conditions (including if a BW was destroyed by shot this turn),
 * saves state, sets the AP bonus flag for the next turn, and updates UI.
 * @param {object} bhVamp - The Bounty Hunter vampire using the ability.
 * @returns {boolean} - True if action successful, false otherwise.
 */
 function executeContractPayoff(bhVamp) {
	 // --- Validation ---
	 if (!bhVamp || currentGameState.players[bhVamp.player]?.class !== 'Bounty Hunter') {
		console.error("executeContractPayoff: Invalid activating vampire.");
		return false;
	 }

	 const cost = AP_COST.CONTRACT_PAYOFF; // Should be 3
	 const abilityName = 'Contract Payoff';
	 const playerIndex = bhVamp.player;
	 const playerResources = currentGameState.playerResources[playerIndex];

	 if (currentGameState.currentAP < cost) {
		 addToLog(`Not enough AP for ${abilityName}. Need ${cost}, have ${currentGameState.currentAP}.`);
		 return false;
	 }
	 if (playerResources.abilitiesUsed.includes(abilityName)) {
		 addToLog(`${abilityName} already used this game.`);
		 return false;
	 }
	 // Check the trigger condition: Was a Bloodwell destroyed by player shot THIS turn?
	 if (!currentGameState.bwDestroyedByShotThisTurn) {
		 addToLog(`Cannot use ${abilityName}: No Bloodwell destroyed by your shot this turn.`);
		 return false;
	 }
	  // Cannot use if cursed? Assumed yes.
	 if (bhVamp.cursed) {
		 addToLog(`Cannot use ${abilityName} while cursed.`);
		 return false;
	 }

	 // --- Action Valid - Execute ---
	 saveStateToHistory(); // Save state before applying effects

	 // Set bonus flag for next turn based on player count
	 const bonusAmount = (numberOfPlayers === 2) ? 3 : 5;
	 playerResources.contractPayoffNextTurnBonus = bonusAmount;
	 playerResources.abilitiesUsed.push(abilityName); // Mark ability as used
	 currentGameState.currentAP -= cost; // Deduct AP

	  // Lock-in logic
	 const currentPlayerClass = currentGameState.players[playerIndex].class; // Should be BH
	 if (currentPlayerClass !== 'Vigilante' && !currentGameState.lockedInVampireIdThisTurn) {
		 currentGameState.lockedInVampireIdThisTurn = bhVamp.id;
		 addToLog(`Locked into controlling ${bhVamp.id} for the rest of the turn.`);
	 }
	  // Update last action vamp ID
	 currentGameState.lastActionVampId = bhVamp.id;

	 addToLog(`${bhVamp.id} activates ${abilityName}! +${bonusAmount} AP next turn. (${currentGameState.currentAP} AP left)`);

	 updateUI(); // Update UI to reflect AP change and ability used status
	 return true; // Action successful
 }

	// --- Batch 4 Ends Here ---
	// Next batch will start with Turn Management & Specific Abilities (nextTurn, executeSwiftJusticeMove, etc.).

	// --- Turn Management & Specific Abilities ---

	/**
	 * Called when the current player clicks "End Turn".
	 * Checks for Swift Justice eligibility and shows custom prompt if applicable,
	 * otherwise proceeds to the next player's turn.
	 */
	function nextTurn() {
		// Check if an action (like selecting a throw target) is still pending
		if (currentGameState.actionState?.pendingAction) {
			addToLog("Cannot end turn: Action pending. Cancel or complete.");
			return;
		}

		const endingPlayerIndex = currentGameState.currentPlayerIndex;
		const endingPlayer = currentGameState.players[endingPlayerIndex];
		const potentialSwiftJusticeVampId = currentGameState.lastActionVampId; // ID of last acting vamp

		let swiftJusticeTriggered = false; // Flag to prevent auto-advancing if prompt shown

		// Check Swift Justice eligibility
		if (endingPlayer?.class === "Sheriff" && !endingPlayer.eliminated && potentialSwiftJusticeVampId) {
			const lastVamp = findVampireById(potentialSwiftJusticeVampId);
			if (lastVamp && lastVamp.player === endingPlayerIndex && !lastVamp.cursed) {
				// --- Show Custom Swift Justice Popup ---
				const sjPopup = popups.swiftJustice;
				const sjMessage = document.getElementById('swift-justice-message');
				if (sjPopup && sjMessage) {
					sjMessage.textContent = `The Sheriffs are duty bound. Execute Swift Justice for ${lastVamp.id}? (Move 1 free)`;
					sjPopup.style.display = 'flex';
					swiftJusticeTriggered = true; // Mark that we paused for user input
				} else {
					console.error("Swift Justice popup elements not found!");
					addToLog("Error showing Swift Justice prompt. Proceeding without.");
				}
			} else {
				// Log why not triggered if relevant conditions were met
				if (lastVamp?.cursed) {
					addToLog("Swift Justice not offered: Last acting Sheriff is cursed.");
				}
			}
		}

		// Proceed to next player ONLY IF the Swift Justice popup was NOT shown
		if (!swiftJusticeTriggered) {
			console.log("No Swift Justice trigger/prompt, proceeding to next turn.");
			saveStateToHistory(); // Save the state of the turn just ended
			proceedToNextPlayerTurn();
		}
		// Otherwise, wait for the Yes/No button click handler
	}

	/**
	 * Executes the Sheriff's Swift Justice move after confirmation.
	 * @param {string} direction - 'N', 'E', 'S', or 'W'.
	 */
	function executeSwiftJusticeMove(direction) {
		// Double check state flags are correctly set
		if (!isSwiftJusticeMovePending || swiftJusticePlayerIndex === -1 || !swiftJusticeVampId) {
			console.error("executeSwiftJusticeMove called incorrectly - state not properly set.");
			// Attempt to reset state and proceed to avoid getting stuck
			isSwiftJusticeMovePending = false;
			swiftJusticePlayerIndex = -1;
			swiftJusticeVampId = null;
			proceedToNextPlayerTurn();
			return;
		}

		const vampire = findVampireById(swiftJusticeVampId);
		if (!vampire || vampire.player !== swiftJusticePlayerIndex) { // Verify vamp exists and belongs to correct player
			console.error("Swift Justice Error: Could not find valid vampire for SJ:", swiftJusticeVampId);
			isSwiftJusticeMovePending = false; // Reset state
			swiftJusticePlayerIndex = -1;
			swiftJusticeVampId = null;
			proceedToNextPlayerTurn(); // Abort SJ and go to next turn
			return;
		}

		// Final eligibility check (not cursed) right before moving
		if (vampire.cursed) {
			addToLog(`Swift Justice cannot be performed by cursed Sheriff (${vampire.id}).`);
			isSwiftJusticeMovePending = false; // Reset state
			swiftJusticePlayerIndex = -1;
			swiftJusticeVampId = null;
			proceedToNextPlayerTurn(); // Abort SJ and go to next turn
			return;
		}

		// Calculate and Validate Target
		const targetCoord = getAdjacentCoord(vampire.coord, direction);
		if (!isValidSwiftJusticeTarget(targetCoord, vampire.id)) {
			addToLog(`Invalid Swift Justice move target: ${targetCoord || 'Off-board'}. Choose another direction.`);
			// Do NOT reset flags or proceed; wait for another direction click
			return;
		}

		// --- Move is Valid ---
		console.log(`Executing Swift Justice move for ${vampire.id} to ${targetCoord} facing ${direction}`);
		saveStateToHistory(); // Save state *before* the SJ move

		// Get reference *in state* for modification
		const vampInState = findVampireById(swiftJusticeVampId); // Use ID just in case reference changed
		if (!vampInState) { // Should not happen if initial check passed, but safety first
			console.error("Swift Justice Error: Failed to get vampire reference in state during execution!");
			undoLastAction(); // Revert history save
			isSwiftJusticeMovePending = false; // Reset state
			swiftJusticePlayerIndex = -1;
			swiftJusticeVampId = null;
			proceedToNextPlayerTurn(); // Abort SJ
			return;
		}

		const originalCoord = vampInState.coord;
		vampInState.coord = targetCoord; // Move the vampire
		vampInState.facing = direction; // Update facing

		addToLog(`Sheriff ${vampInState.id} executed Swift Justice: ${originalCoord} -> ${targetCoord}, facing ${direction}. (0 AP)`);

		// Check Post-Move Effects (Curse/Cure)
		checkSwiftJusticeMoveEndEffects(vampInState);

		// Clean up Swift Justice state
		isSwiftJusticeMovePending = false;
		swiftJusticePlayerIndex = -1;
		swiftJusticeVampId = null;

		// Update Display
		renderBoard(currentGameState);
		updateUI(); // Update buttons etc.

		// NOW proceed to the actual next player's turn
		proceedToNextPlayerTurn();
	}

	/**
	 * Executes the Outlaw's Rampage ability.
	 * @param {object} vampire - The Outlaw vampire performing the action.
	 * @returns {boolean} - True if action successful, false otherwise.
	 */
	function executeRampage(vampire) {
		if (!vampire || currentGameState.players[vampire.player]?.class !== "Outlaw") {
			console.error("executeRampage called incorrectly.");
			addToLog("Only Outlaws can use Rampage.");
			return false;
		}
		const cost = AP_COST.RAMPAGE;
		const abilityName = "Rampage";
		const playerResources = currentGameState.playerResources[vampire.player];

		if (currentGameState.currentAP < cost) {
			addToLog("Not enough AP for Rampage.");
			return false;
		}
		if (playerResources.abilitiesUsed.includes(abilityName)) {
			addToLog("Rampage already used this game.");
			return false;
		}
		if (vampire.cursed) {
			addToLog("Cannot use Rampage while cursed.");
			return false;
		}

		// --- Action is Valid - Proceed ---
		saveStateToHistory();

		// Deduct AP & Mark Used
		currentGameState.currentAP -= cost;
		playerResources.abilitiesUsed.push(abilityName);
		addToLog(`${vampire.id} uses RAMPAGE! Firing Left & Right... (${currentGameState.currentAP} AP left)`);

		// Set Lock-in and Last Action Vamp
		const currentPlayerClass = currentGameState.players[currentGameState.currentPlayerIndex].class;
		if (currentPlayerClass !== 'Vigilante' && !currentGameState.lockedInVampireIdThisTurn) {
			currentGameState.lockedInVampireIdThisTurn = vampire.id;
			addToLog(`Locked into controlling ${vampire.id} for the rest of the turn.`);
		}
		currentGameState.lastActionVampId = vampire.id;

		// Calculate Left/Right Facings
		const currentFacing = vampire.facing;
		const leftFacing = getNewFacing(currentFacing, "L");
		const rightFacing = getNewFacing(currentFacing, "R");

		// Execute the two shots (pass overrideFacing and 0 cost override)
		// executeShoot logs its own path/hits.
		console.log(`Rampage: Firing Left (${leftFacing})`);
		executeShoot(vampire, false, leftFacing, 0);

		console.log(`Rampage: Firing Right (${rightFacing})`);
		executeShoot(vampire, false, rightFacing, 0);

		// Update UI once after both shots resolve
		// Note: executeShoot does NOT call render/updateUI when apCostOverride is non-null
		renderBoard(currentGameState);
		updateUI();
		return true;
	}

	/**
	 * Checks if a target coordinate is valid for a Swift Justice move.
	 * @param {string | null} targetCoord - The coordinate to check.
	 * @param {string} movingVampId - The ID of the moving vampire (unused currently, but good practice).
	 * @returns {boolean} True if the target is valid, false otherwise.
	 */
	function isValidSwiftJusticeTarget(targetCoord, movingVampId) {
		if (!targetCoord) { // Off board
			console.log("Swift Justice Validation Fail: Off board");
			return false;
		}
		const pieceAtTarget = findPieceAtCoord(targetCoord);
		if (pieceAtTarget) {
			// Cannot move onto a square occupied by VAMPIRE, BLOODWELL, or BLACK WIDOW
			if (pieceAtTarget.type === 'vampire' ||
				pieceAtTarget.type === 'bloodwell' ||
				(pieceAtTarget.type === 'hazard' && pieceAtTarget.piece.type === 'Black Widow')) {
				console.log(`Swift Justice Validation Fail: Blocked by ${pieceAtTarget.piece?.type || pieceAtTarget.type}`);
				return false;
			}
		}
		// Allows moving onto empty squares or other hazards (Tombstone, GD, Dynamite)
		return true;
	}

	/**
	 * Checks and applies effects after a Swift Justice move completes (Curse/Cure).
	 * @param {object} vampInState - The vampire object (from currentGameState) that just moved.
	 */
	function checkSwiftJusticeMoveEndEffects(vampInState) {
		const hazardLandedOn = currentGameState.board.hazards.find(h => h.coord === vampInState.coord);

		// Check for landing on Grave Dust (Curse)
		if (hazardLandedOn?.type === 'Grave Dust' && !vampInState.cursed) {
			vampInState.cursed = true;
			vampInState.movesThisTurn = 0;
			addToLog(`${vampInState.id} CURSED by Grave Dust after Swift Justice!`);
		}
		// Check for Bloodbath cure (only if Cursed AND not landing on hazard)
		else if (vampInState.cursed && !hazardLandedOn && isAdjacentToAnyBloodwell(vampInState.coord)) {
			vampInState.cursed = false;
			vampInState.movesThisTurn = 0;
			addToLog(`${vampInState.id} CURED by Bloodbath after Swift Justice!`);
		}
	}

	/**
	 * Helper to check if a coordinate is adjacent (incl. diagonals) to any Bloodwell.
	 * @param {string} coord - The coordinate to check.
	 * @returns {boolean} True if near at least one Bloodwell, false otherwise.
	 */
	function isAdjacentToAnyBloodwell(coord) {
		if (!coord) return false;
		const coordsToCheck = getAllAdjacentCoords(coord);
		coordsToCheck.push(coord); // Also check the square itself

		for (const checkCoord of coordsToCheck) {
			const piece = findPieceAtCoord(checkCoord);
			if (piece?.type === 'bloodwell') {
				return true; // Found a bloodwell in the 3x3 area
			}
		}
		return false;
	}

/**
     * Advances the game to the next active player's turn.
     * Handles turn increments, AP resets/bonuses, state cleanup, and UI updates.
     */
function proceedToNextPlayerTurn() {
	console.log("Proceeding to next player's turn...");

	// --- Reset State from Turn JUST ENDED ---
	const endingPlayerIdx = currentGameState.currentPlayerIndex;
	// Reset flags for the player whose turn just ended
	if (endingPlayerIdx >= 0 && endingPlayerIdx < currentGameState.playerResources.length) {
		currentGameState.playerResources[endingPlayerIdx].wasShotSinceLastTurn = false; // For Vengeance
	}
	// Reset global flags and turn-specific state
	currentGameState.lockedInVampireIdThisTurn = null;
	currentGameState.selectedVampireId = null; // Deselect any vampire
	currentGameState.bwDestroyedByShotThisTurn = false; // <<< ADDED Reset global flag for Contract Payoff
	if (currentGameState.actionState) { // Reset pending actions state completely
		currentGameState.actionState.pendingAction = null;
		currentGameState.actionState.selectedHazardType = null;
		currentGameState.actionState.selectedAbility = null; // <<< ADDED (Ensure ability selections are cleared)
		currentGameState.actionState.abilityTargetData = null; // <<< ADDED
	}
	// Reset movesThisTurn for ALL currently active vampires
	if (currentGameState.board?.vampires) {
		currentGameState.board.vampires.forEach((v) => {
			if (v) v.movesThisTurn = 0;
		});
	}
	// Note: Contract/Vengeance *NextTurnBonus flags are reset after application below.


	// --- Advance Player Index (Find next active player) ---
	let nextPlayerIndex = currentGameState.currentPlayerIndex; // Start from current
	let loopCheck = 0;
	do {
		nextPlayerIndex = (nextPlayerIndex + 1) % numberOfPlayers;
		loopCheck++;
		// Stop if we find an active player OR we've looped through everyone (prevents infinite loop if all eliminated)
	} while (currentGameState.players[nextPlayerIndex]?.eliminated && loopCheck <= numberOfPlayers);

	// If loopCheck exceeds numberOfPlayers, it implies no active players were found (or only one was left)
	if (loopCheck > numberOfPlayers && currentGameState.players.some(p => !p.eliminated)) {
		 // This condition specifically catches potential infinite loops if elimination logic failed
		console.error("Error in proceedToNextPlayerTurn: Could not find next active player!", currentGameState);
		addToLog("FATAL ERROR: Could not advance turn!");
		return; // Game is stuck
	}


	// --- Set New Turn State ---
	const previousPlayerIndex = currentGameState.currentPlayerIndex;
	currentGameState.currentPlayerIndex = nextPlayerIndex;

	// Increment turn number only if we wrapped around to the starting player (or first active player)
	if (currentGameState.currentPlayerIndex <= previousPlayerIndex && loopCheck > 1) { // loopCheck > 1 ensures it wasn't a 1-player scenario
		if (currentGameState.turn > 0 || numberOfPlayers > 1) { // Avoid incrementing turn 0->1 in 1p game setup/testing
			currentGameState.turn++;
			console.log(`Advanced to Turn ${currentGameState.turn}`);
		}
	}

	// --- Get Data for the NEW Player ---
	const startingPlayer = currentGameState.players[currentGameState.currentPlayerIndex];
	const startingPlayerResources = currentGameState.playerResources[currentGameState.currentPlayerIndex];

	// Check if the game should have already ended or if player data is missing
	// This might happen if the last action eliminated the second-to-last player
	if (!startingPlayer || startingPlayer.eliminated || !startingPlayerResources) {
		console.error(`Error starting turn for P${currentGameState.currentPlayerIndex + 1}: Player data invalid or already eliminated.`);
		// Attempt game end check as fallback - maybe the previous turn ended the game
		if (!checkGameEnd()) {
			// If game hasn't ended, something is wrong
			addToLog(`ERROR starting turn for Player ${currentGameState.currentPlayerIndex + 1}.`);
		}
		return; // Don't proceed if the designated player isn't valid
	}
	const playerName = startingPlayer.name; // Use for logging

	// --- Calculate AP for the New Player's Turn ---
	let baseAP = 5; // Standard AP
	// Apply Turn 1 variable AP rules
	if (currentGameState.turn === 1) {
		if (numberOfPlayers === 4) baseAP = [4, 5, 6, 8][currentGameState.currentPlayerIndex];
		else if (numberOfPlayers === 3) baseAP = 6;
		// 2P uses standard 5 AP based on previous logic
	}

	let apBonus = 0; // Start with 0 bonus AP

	// --- Apply Bonuses Earned from Previous Turn ---
	// Apply BH Contract Payoff Bonus
	if (startingPlayerResources.contractPayoffNextTurnBonus > 0) {
		apBonus += startingPlayerResources.contractPayoffNextTurnBonus;
		addToLog(`${playerName} gains +${startingPlayerResources.contractPayoffNextTurnBonus} AP from Contract Payoff!`);
		startingPlayerResources.contractPayoffNextTurnBonus = 0; // Reset after applying
	}
	// Apply Vigilante Vengeance Bonus
	if (startingPlayerResources.vengeanceNextTurnBonus > 0) {
		apBonus += startingPlayerResources.vengeanceNextTurnBonus; // Should be 7
		addToLog(`${playerName} gains +${startingPlayerResources.vengeanceNextTurnBonus} AP from Vengeance is Mine!`);
		startingPlayerResources.vengeanceNextTurnBonus = 0; // Reset after applying
	}

	// --- Apply Start-of-Turn Passive Bonuses ---
	// Apply Vigilante Blood Brothers Bonus Check <<< IMPLEMENTED
	if (startingPlayer.class === 'Vigilante') {
		// Find the player's vampires currently on the board
		const vigVamps = currentGameState.board.vampires.filter(v => v.player === currentGameState.currentPlayerIndex);
		// Check if both vampires exist and have coordinates
		if (vigVamps.length === 2 && vigVamps[0].coord && vigVamps[1].coord) {
			const v1Coord = vigVamps[0].coord;
			const v2Coord = vigVamps[1].coord;
			const areaAroundV1 = getCoordsInArea(v1Coord, 1); // Get 3x3 grid around V1

			// Check if V2's coordinate is within the 3x3 grid of V1
			if (areaAroundV1.includes(v2Coord)) {
				apBonus += 1; // Add the bonus AP
				addToLog(`${playerName} gains +1 AP from Blood Brothers! (Vamps started turn nearby)`);
			}
		}
	}
	// --- End Blood Brothers Check ---

	currentGameState.currentAP = baseAP + apBonus; // Set final AP for the turn

	// --- Final UI Updates for New Turn ---
	clearHighlights(); // Clear any leftover target highlights
	if (movementBar) movementBar.classList.add("hidden"); // Hide movement bar initially
	if (btnUndo) btnUndo.disabled = true; // Disable undo at start of turn (no history yet for this turn)

	renderBoard(currentGameState); // Render board for new turn state
	updateUI(); // Update status bar, info panel, button states

	// Log start of new turn
	addToLog(`--- Turn ${currentGameState.turn} - ${playerName}'s turn (${startingPlayer.class}). AP: ${currentGameState.currentAP} ---`);
}

	// --- Game End / Elimination Logic --- (processExplosionQueue is in this category too)

	/**
	* Processes a queue of Dynamite explosion coordinates, handling chain reactions.
	* Affects pieces and other hazards in a 3x3 area.
	* Assumes the Dynamite triggering the initial call (or added to queue) existed.
	* @param {string[]} explosionQueue - An array of coordinates where Dynamite needs to explode.
	* @param {Set<string>} processedExplosions - A Set tracking coordinates already exploded in this chain.
	*/
	function processExplosionQueue(explosionQueue, processedExplosions) {
		let needsEliminationCheck = false; // Flag to check elimination after the whole chain resolves

		while (explosionQueue.length > 0) {
			const coordToExplode = explosionQueue.shift();

			// Skip if already processed in this chain reaction
			if (processedExplosions.has(coordToExplode)) {
				continue;
			}
			processedExplosions.add(coordToExplode);

			// Log and Remove the Dynamite piece if it hasn't been already
			// (Removal might be redundant if caller or chain reaction already removed it, but ensures it's gone)
			console.log(`Processing explosion effects centered at ${coordToExplode}`);
			addToLog(`Dynamite EXPLODES at ${coordToExplode}!`);
			currentGameState.board.hazards = currentGameState.board.hazards.filter(
				(h) => !(h.type === 'Dynamite' && h.coord === coordToExplode)
			);

			// Get the 3x3 blast area
			const explosionAreaCoords = getCoordsInArea(coordToExplode, 1);

			// Process effects within the blast area
			explosionAreaCoords.forEach((coordInBlast) => {

				const pieceInBlast = findPieceAtCoord(coordInBlast);
				if (pieceInBlast) {
					const affectedPiece = pieceInBlast.piece;
					const affectedType = pieceInBlast.type;

					// --- Apply Effects based on Type ---
					if (affectedType === "bloodwell") {
						// Check if BW still exists before removing
						if (currentGameState.board.bloodwells.some(bw => bw.id === affectedPiece.id)) {
							console.log(`Explosion destroyed Bloodwell ${affectedPiece.id} at ${coordInBlast}`);
							addToLog(`Explosion destroyed Bloodwell ${affectedPiece.id} at ${coordInBlast}!`);
							currentGameState.board.bloodwells = currentGameState.board.bloodwells.filter(bw => bw.id !== affectedPiece.id);
							needsEliminationCheck = true;
						}
					} else if (affectedType === "hazard") {
						// Prevent chain reaction dynamite affecting itself redundantly
						if (affectedPiece.coord === coordToExplode && affectedPiece.type === 'Dynamite') {
							// Skip, already handled/being handled
						} else if (affectedPiece.type === "Dynamite") {
							// Chain Reaction Check
							if (!processedExplosions.has(affectedPiece.coord) && !explosionQueue.includes(affectedPiece.coord)) {
								// Check if this chained dynamite still exists on the board before processing
								if (currentGameState.board.hazards.some(h => h.coord === affectedPiece.coord && h.type === 'Dynamite')) {
									console.log(`Explosion triggers another Dynamite at ${affectedPiece.coord}. Adding to queue.`);
									addToLog(`Explosion triggers nearby Dynamite at ${affectedPiece.coord}!`);
									explosionQueue.push(affectedPiece.coord);
									returnHazardToPool("Dynamite"); // Return the chained dynamite to pool
									// Remove the chained dynamite NOW to prevent processing it again later
									currentGameState.board.hazards = currentGameState.board.hazards.filter(h => h.coord !== affectedPiece.coord);
								}
							}
						} else { // Other hazards (Tombstone, BW, GD)
							// Check if hazard still exists before removing
							if (currentGameState.board.hazards.some(h => h.coord === coordInBlast && h.type === affectedPiece.type)) {
								console.log(`Explosion destroyed Hazard (${affectedPiece.type}) at ${coordInBlast}`);
								addToLog(`Explosion destroyed ${affectedPiece.type} at ${coordInBlast}!`);
								returnHazardToPool(affectedPiece.type); // Return the destroyed hazard
								currentGameState.board.hazards = currentGameState.board.hazards.filter(h => h.coord !== coordInBlast);
							}
						}
					} else if (affectedType === "vampire") { // <<< UPDATED BLOCK START >>>
						// Check if this vampire is still on the board (hasn't been eliminated by another blast in this sequence)
						const vampInState = findVampireById(affectedPiece.id);
						if (vampInState) { // Check if findVampireById returned a valid object
							console.log(`Explosion ELIMINATES Vampire ${affectedPiece.id} at ${coordInBlast}!`);
							addToLog(`Explosion ELIMINATES Vampire ${affectedPiece.id} at ${coordInBlast}!`);

							// Move to eliminated list (using a deep copy)
							currentGameState.eliminatedVampires.push(JSON.parse(JSON.stringify(vampInState)));

							// Remove from active board
							currentGameState.board.vampires = currentGameState.board.vampires.filter(v => v.id !== affectedPiece.id);

							needsEliminationCheck = true; // Ensure elimination/game end is checked later
						}
						// <<< UPDATED BLOCK END >>>
					}
				}
			}); // end forEach coordInBlast
		} // end while(explosionQueue.length > 0)

		console.log("Dynamite chain reaction processing complete.");

		// Check eliminations AFTER the entire chain reaction resolves
		if (needsEliminationCheck) {
			console.log("Checking elimination status after chain reaction.");
			const newlyEliminatedIndexes = new Set();
			for (let i = 0; i < currentGameState.players.length; i++) {
				if (!currentGameState.players[i].eliminated && checkPlayerElimination(i)) {
					if (updateEliminationState(i)) {
						newlyEliminatedIndexes.add(i);
					}
				}
			}
			const gameEnded = checkGameEnd(); // Check for winner AFTER processing all eliminations
			if (gameEnded) {
				// Invalidate undo if game ended due to this action
				gameHistory = [];
				if (btnUndo) btnUndo.disabled = true;
				// Victory popup shown by checkGameEnd
			} else {
				// Show popups only if game continues
				newlyEliminatedIndexes.forEach(eliminatedIndex => {
					showEliminationPopup(eliminatedIndex);
				});
			}
		}

		// Force a final render/update AFTER the entire explosion sequence finishes
		renderBoard(currentGameState);
		updateUI();
	}

	/**
	 * Checks if a player meets elimination conditions (0 Vamps OR 0 Bloodwells).
	 * @param {number} playerIndex - The index of the player to check.
	 * @returns {boolean} - True if the player is eliminated, false otherwise.
	 */
	function checkPlayerElimination(playerIndex) {
		if (!currentGameState?.players?.[playerIndex] || currentGameState.players[playerIndex].eliminated) {
			return false; // Invalid index or already eliminated
		}

		const remainingVamps = currentGameState.board.vampires.filter(v => v.player === playerIndex).length;
		const remainingBloodwells = currentGameState.board.bloodwells.filter(bw => bw.player === playerIndex).length;

		const isEliminated = remainingVamps === 0 || remainingBloodwells === 0;

		if (isEliminated) {
			console.log(`Player ${playerIndex} (${currentGameState.players[playerIndex].name}) elimination condition met (Vamps: ${remainingVamps}, BWs: ${remainingBloodwells}).`);
		}
		return isEliminated;
	}

	/**
	 * Updates game state for an eliminated player (sets flag, removes pieces).
	 * @param {number} playerIndex - The index of the player being eliminated.
	 * @returns {boolean} - True if the state was successfully updated.
	 */
	function updateEliminationState(playerIndex) {
		if (!currentGameState?.players?.[playerIndex] || currentGameState.players[playerIndex].eliminated) {
			return false; // Already eliminated or invalid
		}
		const player = currentGameState.players[playerIndex];
		console.log(`Updating elimination state for P${playerIndex} (${player.name}).`);

		player.eliminated = true; // Set flag
		addToLog(`--- PLAYER ELIMINATED: ${player.name} (${player.class}) ---`);

		// Remove player's remaining pieces from the board
		// Add eliminated vampires to the global list before removing them
		const playerVamps = currentGameState.board.vampires.filter(v => v.player === playerIndex);
		playerVamps.forEach(vamp => {
			// Ensure no duplicates are added (e.g. if elimination checked multiple times)
			if (!currentGameState.eliminatedVampires.some(ev => ev.id === vamp.id)) {
				currentGameState.eliminatedVampires.push(JSON.parse(JSON.stringify(vamp)));
			}
		});

		currentGameState.board.vampires = currentGameState.board.vampires.filter(v => v.player !== playerIndex);
		currentGameState.board.bloodwells = currentGameState.board.bloodwells.filter(bw => bw.player !== playerIndex);

		console.log(`Removed remaining pieces for P${playerIndex}. Player state:`, player);
		return true;
	}

	/**
	 * Displays the "Player Eliminated!" popup.
	 * @param {number} playerIndex - The index of the eliminated player.
	 */
	function showEliminationPopup(playerIndex) {
		const player = currentGameState?.players?.[playerIndex];
		if (!player) {
			console.error(`Cannot show elimination popup: Invalid playerIndex ${playerIndex}.`);
			return;
		}

		const elimPopup = popups.elimination;
		const elimMsg = document.getElementById("elimination-message");
		if (elimPopup && elimMsg) {
			elimMsg.textContent = `${player.name} (${player.class}) has been eliminated!`;
			elimPopup.style.display = "flex";
		} else {
			console.error("Elimination popup elements not found!");
		}
	}

	/**
	 * Checks if the game has ended (only one player left) and handles victory display.
	 * @returns {boolean} - True if the game has ended, false otherwise.
	 */
	function checkGameEnd() {
		if (!currentGameState || !currentGameState.players) return false;

		const activePlayers = currentGameState.players.filter(p => !p.eliminated);

		if (activePlayers.length === 1) {
			// --- Winner Found ---
			const winner = activePlayers[0];
			console.log(`Game Over! Winner: ${winner.name} (${winner.class})`);
			addToLog(`*** GAME OVER! ${winner.name} (${winner.class}) WINS! ***`);

			// Display victory popup
			const victoryPopup = popups.victory;
			const victoryMsg = document.getElementById("victory-message");
			if (victoryPopup && victoryMsg) {
				victoryMsg.textContent = `${winner.name} (${winner.class}) claims the Dreadwood!`;
				victoryPopup.style.display = "flex";
			} else {
				console.error("Victory popup elements not found!");
			}
			// Disable end turn button after game ends
			if (btnEndTurn) btnEndTurn.disabled = true;
			return true; // Game has ended

		} else if (activePlayers.length === 0 && currentGameState.turn > 0) {
			// --- Draw Scenario (Shouldn't happen with last-man-standing?) ---
			console.log("Game Over! No active players left - Draw?");
			addToLog("*** GAME OVER! DRAW? (No players left) ***");
			// Handle draw state - maybe show a different popup or message
			// For now, just disable end turn
			if (btnEndTurn) btnEndTurn.disabled = true;
			return true; // Game has ended (draw)
		}

		return false; // Game continues
	}

	/**
	 * Handles clicks on the game board grid squares. Manages piece selection
	 * and targeting for pending actions like Throw or Order Restored.
	 * @param {Event} event - The click event object.
	 */
	function handleBoardClick(event) {
		const clickedElement = event.target;
		// Find the grid square element, even if the click was on a piece inside it
		const targetSquare = clickedElement.closest(".grid-square");

		if (!targetSquare) {
			// Clicked somewhere on the board container but not on a specific square
			console.log("Clicked outside grid squares.");
			return;
		}

		const targetCoord = targetSquare.dataset.coord;
		if (!targetCoord) {
			console.error("Clicked square missing coordinate data:", targetSquare);
			return;
		}

		// --- Get current state info ---
		const pieceInfo = findPieceAtCoord(targetCoord);
		const currentPlayerIndex = currentGameState.currentPlayerIndex;
		const currentPlayer = currentGameState.players[currentPlayerIndex];
		const currentPlayerClass = currentPlayer?.class;
		const selectedVampId = currentGameState.selectedVampireId;
		const lockedVampId = currentGameState.lockedInVampireIdThisTurn;
		const pendingAction = currentGameState.actionState?.pendingAction;

		console.log(`Board Clicked: Coord=${targetCoord}, Piece=${pieceInfo?.type || 'None'}, PendingAction=${pendingAction}`);

		// --- 1. Handle Clicks Based on Pending Action State ---
		if (pendingAction === "throw-select-target") {
			if (targetSquare.classList.contains("valid-target")) {
				const hazardType = currentGameState.actionState.selectedHazardType;
				const throwingVamp = findVampireById(selectedVampId); // Use the currently selected vampire

				if (throwingVamp && hazardType) {
					// Attempt the throw - executeThrow handles AP, history, etc.
					const success = executeThrow(throwingVamp, hazardType, targetCoord);
					if (success) {
						// Reset action state ONLY on successful execution
						currentGameState.actionState.pendingAction = null;
						currentGameState.actionState.selectedHazardType = null;
						clearHighlights(); // Clear target highlights
						// executeThrow calls render/updateUI
					} else {
						// executeThrow failed (e.g. AP check), keep state, log handled inside executeThrow
					}
				} else {
					console.error("Throw state error: Missing throwing vamp or hazard type during target click.");
					// Reset state defensively
					currentGameState.actionState.pendingAction = null;
					currentGameState.actionState.selectedHazardType = null;
					clearHighlights();
					updateUI();
				}
			} else {
				// Clicked an invalid square while throw target selection was pending
				addToLog("Invalid target for throw. Click a highlighted square or cancel throw.");
			}
			return; // Stop further processing, click was for targeting
		}
		// --- ADDED: Handle click for Order Restored target selection ---
		else if (pendingAction === 'order-restored-select-target') {
			if (targetSquare.classList.contains('valid-target')) {
				// --- Target is Valid - Resolve Order Restored ---
				const abilityData = currentGameState.actionState.abilityTargetData;
				const activatingVamp = findVampireById(abilityData?.activatingVampId);
				const reviveVampId = abilityData?.reviveVampId;
				const playerResources = currentGameState.playerResources[currentPlayerIndex]; // Use current index
				const abilityName = 'Order Restored'; // Or get from actionState.selectedAbility
				const cost = AP_COST.ORDER_RESTORED;

				// Find the specific eliminated Sheriff data to revive
				const eliminatedIndex = currentGameState.eliminatedVampires.findIndex(ev => ev.id === reviveVampId);

				// Double check everything needed exists
				if (activatingVamp && reviveVampId && eliminatedIndex !== -1 && playerResources) {
					// --- Execute the Revival ---
					saveStateToHistory(); // Save state BEFORE revival action completes

					const revivedVampData = currentGameState.eliminatedVampires.splice(eliminatedIndex, 1)[0]; // Remove from eliminated list

					// Reset its state and place on board
					revivedVampData.coord = targetCoord;
					revivedVampData.cursed = false;
					revivedVampData.movesThisTurn = 0;
					revivedVampData.facing = 'S'; // Default facing South after revival (adjust if needed)
					currentGameState.board.vampires.push(revivedVampData); // Add back to active vampires list

					// Deduct cost, mark ability used
					currentGameState.currentAP -= cost;
					playerResources.abilitiesUsed.push(abilityName);

					// Lock-in logic (based on the activating vampire)
					if (currentGameState.players[activatingVamp.player].class !== 'Vigilante' && !currentGameState.lockedInVampireIdThisTurn) {
						currentGameState.lockedInVampireIdThisTurn = activatingVamp.id;
						addToLog(`Locked into controlling ${activatingVamp.id} for the rest of the turn.`);
					}
					currentGameState.lastActionVampId = activatingVamp.id; // Mark activating vamp as last actor

					addToLog(`${activatingVamp.id} uses ${abilityName} to revive ${revivedVampData.id} at ${targetCoord}! (${currentGameState.currentAP} AP left)`);

					// Clear action state now that it's resolved
					currentGameState.actionState.pendingAction = null;
					currentGameState.actionState.selectedAbility = null;
					currentGameState.actionState.abilityTargetData = null;
					clearHighlights(); // Clear revival target highlights
					renderBoard(currentGameState); // Render immediately to show revived piece
					updateUI(); // Update buttons/AP/info panel

				} else {
					// Log error if data was missing unexpectedly
					console.error("Order Restored resolution failed: Missing critical data.", { abilityData, activatingVamp, reviveVampId, eliminatedIndex, playerResources });
					addToLog("Error reviving Sheriff. Action cancelled.");
					// Reset state defensively
					currentGameState.actionState.pendingAction = null;
					currentGameState.actionState.selectedAbility = null;
					currentGameState.actionState.abilityTargetData = null;
					clearHighlights();
					updateUI(); // Update UI to reflect cancellation
				}

			} else {
				// Clicked an invalid square while Order Restored target selection was pending
				addToLog("Invalid target for Order Restored. Click a highlighted empty square.");
				// Do not clear highlights here, let user choose again or cancel (though no cancel implemented yet)
			}
			return; // Stop further processing, click was for ability targeting
		}
		// --- Add 'else if' blocks here for other pending actions (Hand Cannon target etc.) ---


		// --- 2. Handle Clicks for Selection/Deselection (No relevant pending action) ---

		// Always clear highlights if we reach this point (not targeting)
		clearHighlights();

		// Ignore board clicks if waiting for Swift Justice D-Pad input
		if (isSwiftJusticeMovePending) {
			addToLog("Use the Directional buttons to perform the Swift Justice move.");
			return;
		}

		// --- Determine what was clicked (Piece Selection/Deselection Logic) ---
		if (pieceInfo?.type === "vampire") {
			const clickedVamp = pieceInfo.piece;

			// a) Clicked a friendly vampire?
			if (clickedVamp.player === currentPlayerIndex) {
				// Check lock-in rules (Vigilante ignores lock-in for selection)
				const canSelectThisVamp = (currentPlayerClass === 'Vigilante' || !lockedVampId || clickedVamp.id === lockedVampId);

				if (canSelectThisVamp) {
					if (selectedVampId === clickedVamp.id) {
						// Clicked the *already selected* vampire: Deselect
						currentGameState.selectedVampireId = null;
						addToLog(`Deselected ${clickedVamp.id}.`);
					} else {
						// Clicked a *different*, selectable friendly vampire: Select it
						currentGameState.selectedVampireId = clickedVamp.id;
						addToLog(`Selected ${clickedVamp.id}.`);
					}
					updateUI(); // Update UI for selection change
				} else {
					// Cannot select this friendly vampire due to being locked into another
					addToLog(`Cannot select ${clickedVamp.id}. Locked into ${lockedVampId} this turn.`);
					// Do not change selection or update UI here
				}
			}
			// b) Clicked an enemy vampire?
			else {
				if (selectedVampId) addToLog(`Clicked enemy ${clickedVamp.id}. Deselected ${selectedVampId}.`);
				currentGameState.selectedVampireId = null; // Deselect current piece
				// Future: Maybe show info about the enemy piece here?
				updateUI(); // Update UI to show deselection
			}
		}
		// c) Clicked an empty square, hazard, or bloodwell?
		else {
			if (selectedVampId) addToLog(`Clicked ${targetCoord} (${pieceInfo?.type || 'empty'}). Deselected ${selectedVampId}.`);
			currentGameState.selectedVampireId = null; // Deselect current piece
			updateUI(); // Update UI to show deselection
		}
	} // --- End handleBoardClick ---

    /**
     * Handles the selection of a specific hazard type from the picker popup.
     * Updates the action state to 'throw-select-target' and highlights valid targets.
     * @param {string} hazardType - The type of hazard selected (e.g., "Tombstone").
     */
    function handleHazardSelection(hazardType) {
        const selectedVamp = findVampireById(currentGameState?.selectedVampireId);

        // Safety check: Ensure a vampire is still selected
        if (!selectedVamp) {
            console.error("handleHazardSelection Error: No vampire selected when hazard type was chosen.");
            addToLog("Error: Vampire selection lost. Please re-select and try throw again.");
            // Reset throw state
            if (popups.hazardPicker) popups.hazardPicker.style.display = "none";
            currentGameState.actionState.pendingAction = null;
            currentGameState.actionState.selectedHazardType = null;
            clearHighlights();
            updateUI();
            return;
        }

        console.log(`Hazard type selected: ${hazardType}`);

        // Update the action state
        currentGameState.actionState.selectedHazardType = hazardType;
        currentGameState.actionState.pendingAction = "throw-select-target"; // Now waiting for target coord click

        // Hide the hazard picker popup
        if (popups.hazardPicker) popups.hazardPicker.style.display = "none";

        // Highlight the valid target squares on the board for throwing
        highlightThrowTargets(selectedVamp, hazardType); // <<< We need to define this next!

        addToLog(`Selected ${hazardType}. Click a highlighted square to throw.`);
        // No updateUI() needed here, highlighting handles visual change. handleBoardClick will call updateUI after target selection.
    }

    /**
     * Highlights valid target squares (EMPTY SQUARES ONLY) on the board for throwing a hazard
     * ONLY in the direction the vampire is currently facing.
     * Vampires/Bloodwells block Line of Sight for subsequent squares.
     * @param {object} vampire - The vampire object performing the throw.
     * @param {string} hazardType - The type of hazard being thrown.
     */
    function highlightThrowTargets(vampire, hazardType) {
        clearHighlights(); // Clear previous highlights first
        if (!vampire || !vampire.facing) {
             console.error("highlightThrowTargets: Invalid vampire or missing facing data.");
             return;
        }

        console.log(`Highlighting throw targets for ${vampire.id} (facing ${vampire.facing}) throwing ${hazardType}...`);

        const throwRange = 3; // Example: Max range of 3 squares
        const startCoord = vampire.coord;
        const facingDirection = vampire.facing;
        let foundValidTarget = false;
        let currentCoord = startCoord;
        // Path blocking rule: Does V/BW block line of sight for throwing? Assuming Yes.
        let pathBlocked = false;

        for (let distance = 1; distance <= throwRange; distance++) {
            currentCoord = getAdjacentCoord(currentCoord, facingDirection);
            if (!currentCoord) break; // Off board

            const squareElement = gameBoard.querySelector(`.grid-square[data-coord="${currentCoord}"]`);
            if (!squareElement) continue;

            // If path was blocked by V/BW on a *previous* square, mark subsequent squares as invalid
            if (pathBlocked) {
                squareElement.classList.add('invalid-target');
                continue; // Stop checking this square, move to next iteration (or break if you prefer)
            }

            // Check what's on the CURRENT square
            const piece = findPieceAtCoord(currentCoord);

            if (piece) {
                // --- Square is OCCUPIED ---
                // ANY piece makes it an invalid landing spot
                squareElement.classList.add('invalid-target');

                // Check if this piece *also* blocks the path for squares *beyond* it
                if (piece.type === 'vampire' || piece.type === 'bloodwell') {
                    pathBlocked = true; // V/BW block subsequent squares
                }
                // If hazards block LoS, add: else if (piece.type === 'hazard') { pathBlocked = true; }

            } else {
                // --- Square is EMPTY ---
                // This is the only valid landing spot
                squareElement.classList.add('valid-target');
                foundValidTarget = true;
            }

            // Note: If pathBlocked became true in this iteration, the check at the start
            // of the *next* iteration will catch it and mark subsequent squares invalid.

        } // End for loop

        if (!foundValidTarget) {
            addToLog("No valid (empty) targets in range for throw.");
        }
    }

	// --- Batch 5 Ends Here ---
	// Next batch will start with Initialization (initializeGame).

	// --- Initialization ---
	/**
	 * Initializes the game state, board, and UI for starting a new game.
	 */
	function initializeGame() {
        console.trace("initializeGame() called"); // <--- ADD THIS
		console.log("Initializing game with player data:", JSON.stringify(playerData));
		gameHistory = []; // Reset history

		const layouts = LAYOUT_DATA[numberOfPlayers];
		if (!layouts?.length) {
			alert(`Error: No layouts defined for ${numberOfPlayers} players!`);
			showScreen("playerCount"); // Go back if layouts are missing
			return;
		}

		// Select a random layout
		const layoutIdx = Math.floor(Math.random() * layouts.length);
		const layout = layouts[layoutIdx];
		const layoutName = `${numberOfPlayers}P Layout #${layoutIdx + 1}`;
		console.log(`Selected ${layoutName}`);

		// --- Define Initial Game State ---
		currentGameState = {
			players: playerData.map((p, index) => ({
				name: p.name || `P${index + 1}`, // Ensure name exists
				class: p.class,
				eliminated: false,
			})),
			board: {
				vampires: JSON.parse(JSON.stringify(layout.vampires.map(v => ({
					...v,
					cursed: false,
					movesThisTurn: 0
				})))),
				bloodwells: JSON.parse(JSON.stringify(layout.bloodwells)),
				hazards: JSON.parse(JSON.stringify(layout.hazards)),
			},
			hazardPool: {
				Tombstone: 5 - (layout.hazards.filter(h => h.type === "Tombstone").length || 0),
				"Black Widow": 5 - (layout.hazards.filter(h => h.type === "Black Widow").length || 0),
				"Grave Dust": 5 - (layout.hazards.filter(h => h.type === "Grave Dust").length || 0),
				Dynamite: 3,
			},
			playerResources: playerData.map(() => ({
				silverBullet: 1,
				abilitiesUsed: [],
				wasShotSinceLastTurn: false,
				contractPayoffNextTurnBonus: 0,
				vengeanceNextTurnBonus: 0,
			})),
			turn: 1,
			currentPlayerIndex: 0,
			currentAP: 0, // Set below
			selectedVampireId: null,
			lockedInVampireIdThisTurn: null,
			lastActionVampId: null,
			actionState: { // Only one actionState definition now
				pendingAction: null,
				selectedHazardType: null
			},
			bwDestroyedByShotThisTurn: false, // <<< ADDED FLAG
			eliminatedVampires: []
		};

		// --- Set Initial AP ---
		const pIdx = currentGameState.currentPlayerIndex;
		if (currentGameState.turn === 1) {
			if (numberOfPlayers === 4) currentGameState.currentAP = [4, 5, 6, 8][pIdx];
			else if (numberOfPlayers === 3) currentGameState.currentAP = 6;
			else if (numberOfPlayers === 2) currentGameState.currentAP = 5;
			else currentGameState.currentAP = 5; // Default/fallback
		} else {
			// This block shouldn't typically run during initialization,
			// but serves as a fallback if initializeGame were called mid-game somehow.
			console.warn("initializeGame called after turn 1, setting AP to default 5.");
			currentGameState.currentAP = 5;
		}
		console.log(`Initial AP set to: ${currentGameState.currentAP} for Player ${pIdx+1}`);

		// --- Setup Board and UI ---
		generateGrid();
		renderBoard(currentGameState);
		updateUI(); // Set status bar, info panel, buttons

		// --- Final Setup ---
		// Ensure logList element exists before manipulating it
		if (logList) {
			logList.innerHTML = `<li>Game Started: ${layoutName}</li>`;
			// Ensure gameLog element exists before manipulating scroll position
			if (gameLog) gameLog.scrollTop = 0;
		} else {
			console.error("logList element not found during initialization.");
		}

		if (btnUndo) btnUndo.disabled = true;
		if (movementBar) movementBar.classList.add("hidden");

		// Re-attach main gameplay listeners (remove first to prevent duplicates)
		// Ensure gameBoard exists before adding listeners
		if (gameBoard) {
			gameBoard.removeEventListener("click", handleBoardClick);
			gameBoard.addEventListener("click", handleBoardClick);
		} else {
			console.error("gameBoard element not found during initialization.");
		}

		// Ensure buttons exist before adding listeners
		if (btnUndo) {
			btnUndo.removeEventListener("click", undoLastAction);
			btnUndo.addEventListener("click", undoLastAction);
		}
		if (btnEndTurn) {
			btnEndTurn.removeEventListener("click", nextTurn);
			btnEndTurn.addEventListener("click", nextTurn);
		}

		showScreen("gameplay");

		const player = currentGameState.players[pIdx];
		if (player) {
			addToLog(`--- Turn ${currentGameState.turn} - ${player.name}'s turn (${player.class}). AP: ${currentGameState.currentAP} ---`);
		} else {
			// This case should ideally not happen if playerData is correctly processed
			console.error(`Could not find player data for index ${pIdx} at the start of the game.`);
			addToLog(`--- Turn ${currentGameState.turn} - Player ${pIdx + 1}'s turn. AP: ${currentGameState.currentAP} ---`);
		}
	}

    /**
     * Populates the hazard picker popup (#hazard-picker-options)
     * with buttons for available hazards from the current player's pool.
     * Disables options if count is 0 or player lacks AP.
     */
    function populateHazardPicker() {
        // Ensure the container element and hazard pool exist
        if (!hazardPickerOptions || !currentGameState?.hazardPool) {
            console.error("Cannot populate hazard picker: Missing #hazard-picker-options element or game state hazard pool.");
            if (popups.hazardPicker) popups.hazardPicker.style.display = 'none'; // Hide broken picker
            return;
        }

        hazardPickerOptions.innerHTML = ''; // Clear any old options first

        const hazardPool = currentGameState.hazardPool;
        let canThrowSomething = false; // Track if any option is viable

        // Iterate through the defined hazards in the pool
        // (Could also use Object.keys(hazardPool).forEach(...) )
        for (const hazardType in hazardPool) {
            // Check if the property belongs to the object itself (not inherited)
            if (hazardPool.hasOwnProperty(hazardType)) {
                const count = hazardPool[hazardType] || 0; // Get count, default to 0
                const cost = hazardType === "Dynamite" ? AP_COST.THROW_DYNAMITE : AP_COST.THROW_HAZARD;

                // Create a button for this hazard type
                const button = document.createElement('button');
                button.classList.add('btn', 'btn-hazard-option'); // Add base button styling + specific class
                button.dataset.hazardType = hazardType; // Store type in data attribute for the click handler
                button.textContent = `${hazardType} (${count})`; // Display name and count

                // Disable button if count is 0 OR player cannot afford the AP cost
                if (count <= 0) {
                    button.disabled = true;
                    button.title = "None left in pool.";
                } else if (currentGameState.currentAP < cost) {
                    button.disabled = true;
                    button.title = `Requires ${cost} AP (Have ${currentGameState.currentAP})`;
                } else {
                    // Only consider this a viable option if count > 0 and affordable
                    canThrowSomething = true;
                }

                hazardPickerOptions.appendChild(button);
            }
        }

        // Optional: If no hazards are available or affordable, display a message
        if (!canThrowSomething) {
             const p = document.createElement('p');
             p.style.textAlign = 'center'; // Optional styling
             p.textContent = "No hazards available or affordable.";
             hazardPickerOptions.appendChild(p);
             // Maybe disable the 'confirm' part of the picker logic if needed
        }
    }

	// --- 5. Attach Event Listeners (Executed ONCE on script load) ---

	// Setup Screens Listeners
	if (playerCountButtons) {
		playerCountButtons.forEach((button) => {
			button.addEventListener("click", () => {
				numberOfPlayers = parseInt(button.dataset.count);
				if (isNaN(numberOfPlayers) || numberOfPlayers < 2 || numberOfPlayers > 4) {
					console.error("Invalid player count selected:", button.dataset.count);
					return; // Prevent proceeding with invalid count
				}
				playerData = new Array(numberOfPlayers); // Reset player data array
				selectedClasses = []; // Reset selected classes for new setup
				updatePlayerSetupScreen(0); // Setup screen for Player 1 (index 0)
				showScreen("playerSetup");
			});
		});
	} else {
		console.error("Player count buttons container not found.");
	}

	// Back to Start Button (from Player Setup)
	if (btnBackToStart) {
		btnBackToStart.addEventListener("click", () => {
			if (confirm("Return to player count selection? All setup progress will be lost.")) {
				numberOfPlayers = 0;
				currentPlayerSetupIndex = 0;
				playerData = [];
				selectedClasses = [];
				showScreen("playerCount");
				console.log("Returned to player count screen. Setup state reset.");
			}
		});
	}

	// Back Button (within Player Setup)
	if (btnBack) {
		btnBack.addEventListener("click", () => {
			console.log("Back button clicked in setup");
			if (currentPlayerSetupIndex > 0) {
				const newPlayerIndex = currentPlayerSetupIndex - 1;
				// Rebuild selectedClasses based only on players *before* the one we are returning to
				selectedClasses = [];
				for (let i = 0; i < newPlayerIndex; i++) { // Only loop up to *before* newPlayerIndex
					if (playerData[i]?.class) {
						selectedClasses.push(playerData[i].class);
					}
				}
				// Clear data for players *after* the one we are returning to, AND the one we just left
				for (let i = newPlayerIndex + 1; i < playerData.length; i++) {
					if (playerData[i]) playerData[i] = {
						name: `P${i + 1}`,
						class: null
					};
				}
				// No need to clear current index's data as updatePlayerSetupScreen handles reset

				console.log("Rebuilt selectedClasses for Back:", selectedClasses);
				updatePlayerSetupScreen(newPlayerIndex); // Go back to previous player's setup
			}
			// No 'else' needed as the Back button is hidden for Player 1
		});
	}

	// Next / Start Game Button (Player Setup)
	if (btnNext) {
		btnNext.addEventListener("click", () => {
			console.log("Next/Start Game button clicked");
			const currentPlayerData = playerData[currentPlayerSetupIndex];

			if (!currentPlayerData || !currentPlayerData.class) {
				console.error("Next clicked but no class selected!");
				alert("Please select a class before proceeding."); // User feedback
				return;
			}

			// Ensure name is set (use default if empty)
			if (!currentPlayerData.name || currentPlayerData.name.trim() === "") {
				currentPlayerData.name = `P${currentPlayerSetupIndex + 1}`;
				playerData[currentPlayerSetupIndex].name = currentPlayerData.name;
			}

			// Add newly confirmed class to the selected list
			if (!selectedClasses.includes(currentPlayerData.class)) {
				selectedClasses.push(currentPlayerData.class);
			}
			console.log("Confirmed classes:", selectedClasses);

			// Proceed to next player or initialize game
			if (currentPlayerSetupIndex < numberOfPlayers - 1) {
				updatePlayerSetupScreen(currentPlayerSetupIndex + 1);
			} else {
				initializeGame(); // Last player confirmed, start the game
			}
		});
	}

	// Class Selection Buttons (Player Setup)
	classButtons.forEach((button) => {
		button.addEventListener("click", () => {
			if (button.disabled) return; // Ignore clicks if button disabled

			let currentlySelected = classSelectionContainer?.querySelector(".selected");
			if (currentlySelected) {
				currentlySelected.classList.remove("selected");
			}
			button.classList.add("selected");
			const selectedClass = button.dataset.class;

			if (playerData[currentPlayerSetupIndex]) {
				playerData[currentPlayerSetupIndex].class = selectedClass;
			}
			displayClassDetails(selectedClass);
			if (btnNext) btnNext.disabled = false; // Enable Next/Start button
		});
	});

	// Player Name Input (Player Setup)
	if (playerNameInput) {
		playerNameInput.addEventListener("input", () => {
			if (playerData[currentPlayerSetupIndex]) {
				// Update name, fallback to default P# if empty/whitespace
				playerData[currentPlayerSetupIndex].name = playerNameInput.value.trim() || `P${currentPlayerSetupIndex + 1}`;
			}
		});
	}

	// --- Gameplay Screen Global Listeners ---
	if (btnHelp) {
		btnHelp.addEventListener("click", () => {
			console.log("Help button clicked");
			showScreen("howToPlay"); // Show the How-to-Play popup
			const howToPlayContent = popups.howToPlay?.querySelector(".how-to-play-content");
			if (howToPlayContent) howToPlayContent.scrollTop = 0; // Scroll to top
		});
	}

	if (btnBackToGame) { // Back from How-to-Play
		btnBackToGame.addEventListener("click", () => {
			if (popups.howToPlay) popups.howToPlay.style.display = "none"; // Hide popup
		});
	}

	if (btnToggleLog) {
		btnToggleLog.addEventListener("click", () => {
			if (gameLog) {
				gameLog.classList.toggle("log-hidden");
				if (!gameLog.classList.contains("log-hidden")) {
					gameLog.scrollTop = gameLog.scrollHeight; // Scroll down when showing
				}
			}
		});
	}

	if (btnBackToSetup) { // Dev button
		btnBackToSetup.addEventListener("click", () => {
			if (confirm("Return to setup? Game progress will be lost.")) {
				// Reset all relevant state variables
				numberOfPlayers = 0;
				currentPlayerSetupIndex = 0;
				playerData = [];
				selectedClasses = [];
				currentGameState = {}; // Clear game state
				gameHistory = []; // Clear history
				isSwiftJusticeMovePending = false; // Reset SJ state
				swiftJusticePlayerIndex = -1;
				swiftJusticeVampId = null;
				console.log("Returning to setup - game state cleared.");
				showScreen("playerCount"); // Go back to first screen
			}
		});
	}

	// --- Gameplay Action Button Listeners ---
	if (btnShoot) {
		btnShoot.addEventListener("click", () => {
			const vamp = findVampireById(currentGameState?.selectedVampireId);
			if (vamp) executeShoot(vamp, false);
			else addToLog("Select a Vampire to Shoot.");
		});
	}

	if (btnSilverBullet) {
		btnSilverBullet.addEventListener("click", () => {
			const vamp = findVampireById(currentGameState?.selectedVampireId);
			const res = currentGameState?.playerResources?.[currentGameState.currentPlayerIndex];
			if (vamp && res?.silverBullet > 0) {
				if (confirm("Use your only Silver Bullet?")) {
					executeShoot(vamp, true); // Pass true for isSilverBullet
				}
			} else if (!vamp) {
				addToLog("Select a Vampire to use Silver Bullet.");
			} else {
				addToLog("No Silver Bullet left.");
			}
		});
	}

	if (btnThrow) {
		btnThrow.addEventListener("click", () => {
			const vamp = findVampireById(currentGameState?.selectedVampireId);
			if (!vamp) {
				addToLog("Select Vampire to Throw.");
				return;
			}
			if (vamp.cursed) {
				addToLog("Cursed vampires cannot throw.");
				return;
			}
			if (currentGameState.currentAP < AP_COST.THROW_HAZARD) { // Check minimum cost
				addToLog("Not enough AP to initiate Throw.");
				return;
			}
			populateHazardPicker();
			if (popups.hazardPicker) popups.hazardPicker.style.display = "flex";
			if (currentGameState.actionState) currentGameState.actionState.pendingAction = "throw-select-hazard";
			addToLog("Select hazard type to throw.");
		});
	}

	if (btnDispel) {
		btnDispel.addEventListener("click", () => {
			const selectedVamp = findVampireById(currentGameState?.selectedVampireId);
			if (selectedVamp) executeDispel(selectedVamp);
			else addToLog("Select a Vampire to Dispel.");
		});
	}

	if (btnBiteFuse) {
		btnBiteFuse.addEventListener("click", () => {
			const selectedVamp = findVampireById(currentGameState?.selectedVampireId);
			if (selectedVamp) executeBiteFuse(selectedVamp);
			else addToLog("Select a Vampire to Bite Fuse.");
		});
	}

	// --- Class Ability Button Listeners ---
    if (btnRampage) { // Keep user's existing Rampage listener
        btnRampage.addEventListener("click", () => {
            const selectedVamp = findVampireById(currentGameState?.selectedVampireId);
            if (selectedVamp && currentGameState.players[selectedVamp.player]?.class === 'Outlaw') {
                executeRampage(selectedVamp);
            } else if (!selectedVamp) {
                addToLog("Select an Outlaw Vampire to use Rampage.");
            } else {
                addToLog("Only Outlaws can Rampage."); // Should be hidden anyway, but safety check
            }
        });
    }

    if (btnHandCannon) { // Keep user's existing Hand Cannon placeholder listener
        btnHandCannon.addEventListener("click", () => {
            const selectedVamp = findVampireById(currentGameState?.selectedVampireId);
            if (selectedVamp && currentGameState.players[selectedVamp.player]?.class === 'Outlaw') {
                addToLog("Attempting Hand Cannon (Logic TBD)...");
                // executeHandCannon(selectedVamp); // Call when implemented
            } else {
                addToLog("Select an Outlaw for Hand Cannon.");
            }
        });
    }

    // Contract Payoff Button (Bounty Hunter Only) - UPDATED LISTENER
    if (btnContractPayoff) {
        btnContractPayoff.addEventListener("click", () => {
            const selectedVamp = findVampireById(currentGameState?.selectedVampireId);
            // Basic check: Is a Bounty Hunter selected? (More detailed checks in execute function)
            if (selectedVamp && currentGameState.players[selectedVamp.player]?.class === 'Bounty Hunter') {
                 executeContractPayoff(selectedVamp); // Call the actual execution function
            } else if (!selectedVamp) {
                addToLog("Select a Bounty Hunter to use Contract Payoff.");
            } else {
                // Log if wrong class is selected, though button should ideally be disabled/hidden
                addToLog("Only Bounty Hunters can use Contract Payoff.");
            }
        });
    }

    // Order Restored Button (Sheriff Only) - UPDATED LISTENER
    if (btnOrderRestored) {
        btnOrderRestored.addEventListener("click", () => {
            const selectedVamp = findVampireById(currentGameState?.selectedVampireId);
            // Basic check: Is a Sheriff selected?
            if (selectedVamp && currentGameState.players[selectedVamp.player]?.class === 'Sheriff') {
                executeOrderRestored(selectedVamp); // Call the actual execution function (initiates targeting)
            } else if (!selectedVamp) {
                addToLog("Select a Sheriff to use Order Restored.");
            } else {
                addToLog("Only Sheriffs can use Order Restored.");
            }
        });
    }

    // Vengeance is Mine Button (Vigilante Only) - UPDATED LISTENER
    if (btnVengeance) {
        btnVengeance.addEventListener("click", () => {
            const selectedVamp = findVampireById(currentGameState?.selectedVampireId);
            // Basic check: Is a Vigilante selected?
            if (selectedVamp && currentGameState.players[selectedVamp.player]?.class === 'Vigilante') {
                executeVengeanceIsMine(selectedVamp); // Call the function to execute the ability
            } else if (!selectedVamp) {
                addToLog("Select a Vigilante to use Vengeance is Mine.");
            } else {
                addToLog("Only Vigilantes can use Vengeance is Mine.");
            }
        });
    }


	// --- D-Pad Movement Listener ---
	const handleDirectionButtonClick = (direction) => {
		// Check for Swift Justice first
		if (isSwiftJusticeMovePending) {
			console.log("Calling executeSwiftJusticeMove for direction:", direction);
			executeSwiftJusticeMove(direction);
			return; // Stop processing for normal move/pivot
		}

		// Normal Move/Pivot
		const selectedVamp = findVampireById(currentGameState?.selectedVampireId);
		if (!selectedVamp) {
			addToLog("Select a Vampire first.");
			return;
		}

		if (direction === selectedVamp.facing) { // Attempt Move Forward
			const targetCoord = getAdjacentCoord(selectedVamp.coord, direction);
			if (targetCoord) {
				executeMove(selectedVamp, targetCoord); // Handles checks & execution
			} else {
				addToLog("Cannot move off the board.");
			}
		} else { // Attempt Pivot
			executePivot(selectedVamp, direction); // Handles checks & execution
		}
	};

	if (btnMoveN) btnMoveN.addEventListener("click", () => handleDirectionButtonClick("N"));
	if (btnMoveE) btnMoveE.addEventListener("click", () => handleDirectionButtonClick("E"));
	if (btnMoveS) btnMoveS.addEventListener("click", () => handleDirectionButtonClick("S"));
	if (btnMoveW) btnMoveW.addEventListener("click", () => handleDirectionButtonClick("W"));

	// --- Hazard Picker Popup Listeners ---
	if (btnCancelThrow) {
		btnCancelThrow.addEventListener("click", () => {
			if (popups.hazardPicker) popups.hazardPicker.style.display = "none";
			if (currentGameState.actionState) {
				currentGameState.actionState.pendingAction = null;
				currentGameState.actionState.selectedHazardType = null;
			}
			clearHighlights();
			addToLog("Throw action cancelled.");
		});
	}

	if (hazardPickerOptions) {
		hazardPickerOptions.addEventListener("click", (event) => {
			const button = event.target.closest("button");
			if (button && button.dataset.hazardType) {
				handleHazardSelection(button.dataset.hazardType);
			}
		});
	}

	// --- Swift Justice Popup Listeners ---
	if (btnSwiftJusticeYes) {
		btnSwiftJusticeYes.addEventListener('click', () => {
			if (popups.swiftJustice) popups.swiftJustice.style.display = 'none';

			isSwiftJusticeMovePending = true;
			swiftJusticePlayerIndex = currentGameState.currentPlayerIndex;
			swiftJusticeVampId = currentGameState.lastActionVampId;

			if (swiftJusticePlayerIndex === -1 || !swiftJusticeVampId || currentGameState.players[swiftJusticePlayerIndex]?.class !== 'Sheriff') {
				console.error("Swift Justice Yes Error: State mismatch.");
				isSwiftJusticeMovePending = false;
				swiftJusticePlayerIndex = -1;
				swiftJusticeVampId = null;
				saveStateToHistory(); // Save state before trying to recover
				proceedToNextPlayerTurn();
				return;
			}

			addToLog(`Sheriff ${swiftJusticeVampId} will execute Swift Justice. Select move direction.`);
			updateUI(); // Enable D-pad etc.
		});
	} else {
		console.warn("Swift Justice YES button (#btn-swift-justice-yes) not found");
	}

	if (btnSwiftJusticeNo) {
		btnSwiftJusticeNo.addEventListener('click', () => {
			if (popups.swiftJustice) popups.swiftJustice.style.display = 'none';
			addToLog("Sheriff declined Swift Justice.");
			saveStateToHistory();
			proceedToNextPlayerTurn();
		});
	} else {
		console.warn("Swift Justice NO button (#btn-swift-justice-no) not found");
	}

	// --- Elimination/Victory Popup Listeners ---
	const btnCloseElimination = document.getElementById("btn-close-elimination");
	if (btnCloseElimination) {
		btnCloseElimination.addEventListener("click", () => {
			if (popups.elimination) popups.elimination.style.display = "none";
			checkGameEnd(); // Check if closing this triggers game end
		});
	} else {
		console.warn("Elimination popup close button not found");
	}

	const btnRestartVictory = document.getElementById("btn-restart-victory");
	if (btnRestartVictory) {
		btnRestartVictory.addEventListener("click", () => {
			// Simplest restart: Reload the page
			window.location.reload();
		});
	} else {
		console.warn("Victory popup restart button not found");
	}

	// --- 6. Initial Call ---
	showScreen("playerCount"); // Start by showing the player count selection

}); // --- End DOMContentLoaded ---
