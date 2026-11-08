# Exercises

Homework exercises for this course. Each exercise is self-contained in its own folder, and all of them share one virtual environment and one `requirements.txt` in this folder.

| # | Topic | Folder |
|:---:|---|---|
| **HW1** | **$k$-ary Fat-Tree Generation, Link Failures & Bisection Bandwidth**<br>Constructing Clos topologies, modeling link degradation, and showing that failures reduce path diversity $(1-p)^4$ well before reachability drops. | [ex1/](ex1/README.md) |
| **HW3** | **Miswire Hunt: Neighbor Discovery in a shared Clos fabric**<br>A browser game for the whole class, based on Jupiter Rising Sections 5.2.1 and 5.3. Each student is one switch; together they find five hidden faults. | [ex3/](ex3/README.md) |

---

## Setup

Requires Python 3.9+. Run once from this folder:

```bash
python -m venv .venv
.venv\Scripts\activate          # Windows (Linux/macOS: source .venv/bin/activate)
pip install -r requirements.txt
```

Run tests from the exercise subdirectory:

```bash
cd ex1
python -m pytest test_fattree.py -v
```
