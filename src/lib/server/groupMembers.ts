/**
 * Splits each group's member tags into the members a viewer may see and a
 * count of the hidden members. A viewer who cannot see hidden monitors gets
 * the count only, so the page never sends a hidden member's tag.
 */
export interface GroupMemberLists {
  membersByTag: Record<string, string[]>;
  hiddenCountByTag: Record<string, number>;
}

export const SplitGroupMembers = (
  membersByTag: Record<string, string[]>,
  hiddenTags: ReadonlySet<string>,
): GroupMemberLists => {
  const visible: Record<string, string[]> = {};
  const hiddenCountByTag: Record<string, number> = {};
  for (const [groupTag, members] of Object.entries(membersByTag)) {
    visible[groupTag] = members.filter((tag) => !hiddenTags.has(tag));
    const hiddenCount = members.length - visible[groupTag].length;
    if (hiddenCount > 0) hiddenCountByTag[groupTag] = hiddenCount;
  }
  return { membersByTag: visible, hiddenCountByTag };
};
