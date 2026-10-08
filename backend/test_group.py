from summarization.summarizer import balanced_groups

for n in [1, 2, 5, 6, 11, 26]:
    print(n, [len(g) for g in balanced_groups(list(range(n)), 5)])