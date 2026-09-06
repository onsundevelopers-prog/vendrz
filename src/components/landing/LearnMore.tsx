/* ------------------------------------------------------------------ */
/*  Long-form content - written for humans and search engines.        */
/*                                                                     */
/*  Plain-language explainers around the core questions customers      */
/*  actually type into Google: how to give video feedback, why voice   */
/*  feedback is faster than typing, and what makes Flask different.   */
/*  No jargon, no invented claims - every paragraph describes what     */
/*  Flask really does.                                                 */
/* ------------------------------------------------------------------ */

export function LearnMore() {
  return (
    <section className="border-t border-line bg-surface py-24 lg:py-32">
      <div className="mx-auto max-w-3xl px-5 lg:px-8">
        <p className="text-center text-[12px] font-[510] tracking-[-0.01em] text-faint">
          Learn
        </p>
        <h2 className="mt-4 text-center text-balance text-4xl font-[510] leading-[1.05] tracking-[-0.022em] text-fg sm:text-5xl">
          Why video feedback should be fast, not painful.
        </h2>

        <div className="mt-12 space-y-10 text-[15px] font-normal leading-[1.7] tracking-[-0.011em] text-faint">
          <div className="space-y-4">
            <p>
              Every creative team has been there: you watch a video, have Ideas
              about what needs to change, and then spend twenty minutes typing
              them out as written comments. By the time you finish, you've lost
              the context, the creator has moved on, and your feedback still
              reads like it was written by someone who was multitasking. Video
              feedback shouldn't be this painful.
            </p>
            <p>
              The problem isn't that people can't write. It's that writing is
              slow, and video moves fast. When you're watching a 30-second spot
              or a two-minute explainer, you think of things at the speed of
              speech - not the speed of typing. So you either hold your thoughts
              until the video ends (and forget half of them), or you pause every
              ten seconds to type a comment (and lose the flow). Neither is
              great.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-[19px] font-[510] tracking-[-0.016em] text-fg">
              Why voice feedback is faster than typing
            </h3>
            <p>
              Speaking is faster than typing - most people speak three to four
              times faster than they type, and the ideas come out in the order
              they occur, with tone and emphasis intact. That's why Flask lets
              you record voice feedback directly on the video timeline. Press
              record, speak your note, and Flask captures it at the exact moment
              in the video.
            </p>
            <p>
              Voice feedback also carries context that text loses: the urgency in
              your voice when something is critical, the casual tone when
              something is a suggestion, the natural pauses and emphasis that
              make your intent clear. A timestamped voice note at 0:47 says more
              than "fix this" ever could.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-[19px] font-[510] tracking-[-0.016em] text-fg">
              What makes Flask different from comment threads
            </h3>
            <p>
              Traditional video feedback lives in scattered places: comments on
              a shared drive, emails with timestamps ("around 1:30 there's an
              issue"), Slack threads that lose the context, and spreadsheets
              that nobody maintains. Flask consolidates all of this into one
              place.
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <span className="font-medium text-fg">Voice notes at the right moment</span>{" "}
                - record feedback while watching, and Flask timestamps it to the
                exact frame. No more "at 1:32-ish" or "the part where the
                character walks in."
              </li>
              <li>
                <span className="font-medium text-fg">Draw on the frame</span>{" "}
                - circle the thing you're talking about, add arrows, sketch an
                idea. Visual feedback is clearer than verbal feedback, and Flask
                lets you do both.
              </li>
              <li>
                <span className="font-medium text-fg">Share reference images</span>{" "}
                - show, don't just tell. Drop in a reference image at the right
                moment and your feedback becomes concrete.
              </li>
              <li>
                <span className="font-medium text-fg">Auto-organized by scene</span>{" "}
                - Flask groups your feedback by scene, topic, or reviewer, so
                creators see what needs attention and reviewers can track what's
                been resolved.
              </li>
            </ul>
            <p>
              Flask doesn't replace your existing tools - it replaces the scattered
              workaround you've built on top of them. Upload a video, give
              feedback your way, and share the organized result with your team.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-[19px] font-[510] tracking-[-0.016em] text-fg">
              Who Flask is for
            </h3>
            <p>
              Flask is for creative teams who review video content regularly:
              marketing teams reviewing campaign videos, product teams reviewing
              demos and tutorials, design teams reviewing animations, agencies
              reviewing client work, and anyone else who's ever said "can you
              check this video and let me know what you think?"
            </p>
            <p>
              If you give feedback on videos more than once a month, Flask pays
              for itself in the first week by cutting the time you spend
              coordinating feedback. If you've ever lost a comment in a Slack
              thread or had to re-explain what you meant in a written review,
              Flask is the tool you've been looking for.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
