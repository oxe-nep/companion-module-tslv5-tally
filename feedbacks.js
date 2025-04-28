const { combineRgb } = require('@companion-module/base')

module.exports = function (self) {
	const feedbacks = {}

	// Add feedback for each tally state
	feedbacks.tally_state = {
		type: 'boolean',
		name: 'Tally State',
		description: 'Show if a specific tally is active',
		defaultStyle: {
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(255, 0, 0),
		},
		options: [
			{
				type: 'number',
				label: 'Tally Index',
				id: 'index',
				default: 1,
				min: 1,
				max: 100
			}
		],
		callback: (feedback) => {
			return self.tallyStates.get(feedback.options.index) || false
		}
	}

	self.setFeedbackDefinitions(feedbacks)
}
