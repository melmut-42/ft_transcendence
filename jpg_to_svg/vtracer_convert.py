#!/usr/bin/env python3
"""Convert a JPEG/PNG image to a compact, seam-free SVG with VTracer."""

import argparse
from pathlib import Path

import vtracer


def build_config(max_colors: int, simplify: float):
    """Return a color/spline configuration with shared, gap-free edges."""
    return vtracer.Config(
        clustering="color-cluster",
        hierarchical="cutout",
        mode="spline",
        filter_speckle=8,
        color_precision=6,
        layer_difference=16,
        corner_threshold=60,
        length_threshold=4.0,
        max_iterations=10,
        splice_threshold=45,
        simplify=simplify,
        path_precision=1,
        max_colors=max_colors,
        optimize=2,
    )


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Convert a raster image to a curved, seam-free SVG."
    )
    parser.add_argument("input", type=Path, help="Input JPEG/PNG file")
    parser.add_argument("output", type=Path, help="Output SVG file")
    parser.add_argument("--colors", type=int, default=14)
    parser.add_argument("--simplify", type=float, default=1.5)
    args = parser.parse_args()

    if not args.input.is_file():
        parser.error(f"input file not found: {args.input}")

    args.output.parent.mkdir(parents=True, exist_ok=True)
    config = build_config(args.colors, args.simplify)

    print(f"Converting {args.input} ...", flush=True)
    config.convert_file(str(args.input), str(args.output))

    if not args.output.is_file():
        raise RuntimeError("VTracer finished but did not create the SVG file")

    size_kb = args.output.stat().st_size / 1024
    print(f"Created: {args.output.resolve()}")
    print(f"Size: {size_kb:.1f} KB")


if __name__ == "__main__":
    main()
