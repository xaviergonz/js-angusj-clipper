#### enum JoinType

When adding paths to a offset operation, the joinType parameter may be one of three types - Miter, Square or Round.

![image](https://user-images.githubusercontent.com/6306796/28290053-31d7b0b6-6b45-11e7-8b81-d47241617f90.png)

###### Values
* **Miter**

    There's a necessary limit to mitered joins since offsetting edges that join at very acute angles will produce excessively long and narrow 'spikes'. To contain these potential spikes, the ClippOffset object's MiterLimit property specifies a maximum distance that vertices will be offset (in multiples of delta). For any given edge join, when miter offsetting would exceed that maximum distance, 'square' joining is applied.

* **Round**

    While flattened paths can never perfectly trace an arc, they are approximated by a series of arc chords (see ClipperObject's ArcTolerance property).

* **Square**

    Squaring is applied uniformally at all convex edge joins at 1 × delta. 

