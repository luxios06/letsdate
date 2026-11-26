# Action and Reply Generation

Use this reference before writing `nextMessage`, `messageOptions`, `ifWarm`, `ifCold`, or `conversationMoves`.

## Learn the user's voice

Read the SELF turns and `self_profile` before writing replies. Observe only visible style features:

- Approximate message length.
- Directness or indirectness.
- Use of punctuation, emoji, and line breaks.
- Formal versus casual wording.
- Whether the user tends to ask questions or make statements.

Do not infer hidden personality from the user's style. Do not reuse old facts, promises, plans, or intimacy as if they were current intentions.

If the SELF voice sample is weak or contradictory:

- Use a short, neutral, natural style.
- Do not add nicknames, pet names, emoji, or declarations of intimacy.
- Do not imitate hostile or self-deprecating language.

## Reuse context

Concrete details make a reply useful, but the model must not invent them. Before writing, extract:

- A day or time explicitly mentioned.
- A shared activity or topic explicitly mentioned.
- A boundary or uncertainty explicitly stated.
- Whether the other person already proposed a next step.

If no concrete activity exists, do not fabricate a restaurant, exhibition, trip, or gift. Ask a natural question or keep the reply generic.

## Three reply options

Return exactly three distinct tones:

1. `留空间`: clear intent, easy exit.
2. `直接确认`: asks for a concrete action without pressure.
3. `轻松一点`: lighter tone, same boundary.

Each reply must be independently sendable. Do not make option 2 depend on option 1.

Good structure for a positive invitation:

```text
acknowledge the other person's constraint
+ one concrete and low-pressure action
+ an easy alternative or exit
```

For uncertain or cold signals, the best reply may be:

- Stop adding pressure.
- Ask one clarifying question.
- Let the other person demonstrate reciprocal interest.
- Give the user permission not to chase.

## Forbidden patterns

Do not write replies that:

- Test, trap, guilt, threaten, or punish the other person.
- Pretend to be unbothered while demanding a response.
- Encourage repeated messages after silence.
- Use jealousy or fabricated alternatives.
- Claim the other person's hidden feelings as fact.
- Promise something the user did not authorize.
- Use PUA, negging, love-bombing, or surveillance tactics.

## Branching after the reply

`ifWarm` should describe how to respond only when the other person takes a concrete step forward.

`ifCold` should describe when to stop, wait, or reduce investment. Include observable conditions such as:

- Repeatedly ignored questions.
- No concrete response after a stated confirmation time.
- Only polite filler with no reciprocal action.
- Boundary violation or pressure.

Do not tell the user to keep escalating until they receive an answer.

## Empathy and reflection lenses

When the user needs help understanding the interaction rather than sending a message, use:

- Observation: what happened without judgment.
- Possible feeling: label it as a hypothesis.
- Possible need: what the behavior may be trying to protect or obtain.
- Request or action: one clear, low-pressure next step.

When reviewing the user's own behavior:

- Separate facts from interpretations.
- Identify one effective behavior.
- Identify one adjustable behavior.
- Propose one testable next action.
