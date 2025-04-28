const { InstanceBase, Regex, runEntrypoint, InstanceStatus } = require('@companion-module/base')
const UpgradeScripts = require('./upgrades')
const UpdateActions = require('./actions')
const UpdateFeedbacks = require('./feedbacks')
const UpdateVariableDefinitions = require('./variables')
const TSL5 = require('tsl-umd-v5')

class ModuleInstance extends InstanceBase {
	constructor(internal) {
		super(internal)
		this.tallyStates = new Map()
		this.tsl = null
		this.variableDefinitions = new Map()
	}

	async init(config) {
		this.config = config
		this.updateStatus(InstanceStatus.Connecting)

		try {
			await this.startTSLListener()
			this.updateStatus(InstanceStatus.Ok)
		} catch (error) {
			this.log('error', `Failed to start TSL listener: ${error.message}`)
			this.updateStatus(InstanceStatus.ConnectionFailure)
		}

		this.updateActions()
		this.updateFeedbacks()
		this.updateVariableDefinitions()
	}

	async destroy() {
		if (this.tsl) {
			this.tsl.close()
			this.tsl = null
		}
	}

	async configUpdated(config) {
		this.config = config
		await this.destroy()
		await this.init(config)
	}

	getConfigFields() {
		return [
			{
				type: 'textinput',
				id: 'udpPort',
				label: 'UDP Port',
				width: 6,
				default: '8900',
				regex: Regex.PORT,
			},
			{
				type: 'textinput',
				id: 'tcpPort',
				label: 'TCP Port',
				width: 6,
				default: '9000',
				regex: Regex.PORT,
			}
		]
	}

	async startTSLListener() {
		return new Promise((resolve, reject) => {
			try {
				this.tsl = new TSL5()
				
				// Listen for UDP tallies
				this.tsl.listenUDP(parseInt(this.config.udpPort))
				
				// Listen for TCP tallies
				this.tsl.listenTCP(parseInt(this.config.tcpPort))

				this.tsl.on('message', (msg) => {
					this.handleTallyData(msg)
				})

				this.log('info', `Listening for TSL V5 on UDP port ${this.config.udpPort} and TCP port ${this.config.tcpPort}`)
				resolve()
			} catch (error) {
				reject(error)
			}
		})
	}

	addTallyVariable(index) {
		if (!this.variableDefinitions.has(index)) {
			const variableId = `tally_${index}`
			this.variableDefinitions.set(index, {
				variableId: variableId,
				name: `Tally ${index} State`,
				description: `Shows if tally ${index} is active (true) or inactive (false)`
			})

			// Update variable definitions
			const definitions = Array.from(this.variableDefinitions.values())
			this.setVariableDefinitions(definitions)

			// Initialize variable value
			this.setVariableValues({
				[variableId]: false
			})
		}
	}

	handleTallyData(tallyData) {
		// Update tally states
			const index = tallyData.index
			let isActive

			if (tallyData.display.lh_tally === 1 || tallyData.display.rh_tally === 1 || tallyData.display.text_tally === 1) {
				isActive = true
			} else {
				isActive = false
			}
			
			// Add variable if it doesn't exist
			this.addTallyVariable(index)
			
		
			this.tallyStates.set(index, isActive)
			this.setVariableValues({
				[`tally_${index}`]: isActive
			})
			this.checkFeedbacks(`tally_state`)
			
		
	}

	updateActions() {
		UpdateActions(this)
	}

	updateFeedbacks() {
		UpdateFeedbacks(this)
	}

	updateVariableDefinitions() {
		UpdateVariableDefinitions(this)
	}
}

runEntrypoint(ModuleInstance, UpgradeScripts)
