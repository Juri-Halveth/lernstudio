# Focused Learning Journey

## Design Contract

- Home presents one active mission. The optional map remains available.
- Feedback explains the selected action; a correct answer exposes one next step.
- No countdown, random payout, public ranking or penalty for trying again.
- Arrival progress is distinct from curriculum completion. The next lesson is
  the first unfinished lesson in the learner's last selected track.
- Scenes support the current activity, not an unrelated claim about learning.
- Text remains sufficient with motion and audio disabled. Music is opt-in.
- A local note can open a real lesson. Import does not execute its content or
  publish it, and an imported claim does not become a verified fact.

The implementation includes three small arrival missions and the existing
curriculum renderer. It is not a claim that every lesson was individually
rewritten as a new game. New missions must preserve stable lesson addresses,
free guest access and the existing progress contract.

## Source-Informed Choices

Three AI coding roles worked on learning design, procedural 3D and data
interchange. The following people were not hired, consulted or represented as
reviewers. These are published sources informing local design decisions:

1. [Jesse Schell / Schell Games: The Lens of Goals](https://schellgames.com/blog/lens-of-goals).
   The studio's design guidance motivates a concrete, achievable active goal
   and meaningful connections between smaller goals. Our inference is one
   question per arrival station, with voluntary access to the map.
2. [UC Santa Barbara CITRAL: Explaining Content](https://citral.ucsb.edu/faculty/resources/engaging-students/explaining-content).
   This institutional teaching resource summarizes Richard Mayer's principles
   of segmenting, signaling and keeping related words and images close.
   Our inference is to keep the task, choices and feedback together.
   This is a teaching summary, not an original learning-outcome experiment.
3. [Raph Koster: Hints and Riddles](https://www.raphkoster.com/2006/06/08/hints-and-riddles/).
   The author's discussion of feedback and intermediate states informs our
   answer-specific retry messages and the explicit continue action.

Sources reviewed on 2026-10-02. These decisions have functional and browser
tests, not a measured proof of learning effectiveness. A learner study should
check whether participants explain the rule, predict a new result and transfer
it to another example. Merely clicking the correct answer does not prove that.

## Extension Points

`expedition.js` is the pure mission model. `journey-ui.js` owns the current
screen and explicit actions. `learning-bay.js` owns only its scene lifecycle.
`learning-packets.js` validates the versioned data exchange.

The public read API derives from `curriculum.js`; adding a lesson should not
require hand-maintained catalogue counts. Each new mission needs a real lesson
anchor and deterministic feedback. Browser changes require desktop/mobile,
keyboard, reduced-motion and no-WebGL checks. Any server, external agent action
or publication capability is a separate reviewed change.
