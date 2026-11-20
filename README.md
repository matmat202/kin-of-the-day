# Kin of the Day

**https://matmat202.github.io/kin-of-the-day/**

One species a day, drawn as its lineage back to the ancestor it shares with you. Every
day the page draws all 100 species in the pool as faint branches rising from the moment
each split from the human line; that day's species is drawn bold. The words say when you
last shared an ancestor, which ancestor it was, and where that moment falls on a calendar
where the Earth forms on January 1.

- Tree and names: [Open Tree of Life](https://tree.opentreeoflife.org/) synthetic tree.
- Ages: [TimeTree](https://timetree.org/) median for each species and *Homo sapiens*.
  Where TimeTree's pairs contradict the tree (human–jellyfish 682 Mya, human–fly 721),
  the deeper split is raised to stay consistent, and the page says so on those days.

- Pictures and links: each species' [Wikipedia](https://en.wikipedia.org/) article and its
  lead picture from [Wikimedia Commons](https://commons.wikimedia.org/), shown only under a
  free licence (public domain, CC0, CC BY, CC BY-SA) and credited with author and licence
  on the page. Three species whose picture is GFDL get the link alone.

**[/story/](https://matmat202.github.io/kin-of-the-day/story/)**, "Sure of the order": all 100 on the
Earth's calendar (none before September, 40 in December), TimeTree's ranges as the control
(46 of 100 could fall in another month), and the 6% of pairs only the tree can order.
`python3 build_story.py` rebuilds it; `node test/story.test.mjs [--control]` and
`test/run-story.sh [--control]` gate it.

`?d=YYYY-MM-DD` shows any day; "Save" makes a PNG of the drawing (the share sheet on a phone, a download elsewhere). `node kin-logic.test.mjs` runs
the logic suite. Built with Claude Code.
