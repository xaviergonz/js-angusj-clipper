#### interface OffsetInput

A single input (of multiple possible inputs) for the offsetToPaths / offsetToPolyTree operation.

###### Required properties

* **data: [Path](../shared/Path.md) | [Paths](../shared/Paths.md)**

    Data of one of the Path or Paths to be used in preparation for offsetting.
    
    All 'outer' Paths must have the same orientation, and any 'hole' paths must have reverse orientation. Closed paths must have at least 3 vertices.
    Open paths may have as few as one vertex. Open paths can only be offset with positive deltas.

* **joinType: [JoinType](./JoinType.md)**

    Join type.

* **endType: [EndType](./EndType.md)**

    End type.
