# JPEG to SVG Utility

A small utility used by the frontend team during the 42 `ft_transcendence`
project. It converts JPEG and PNG assets into compact SVG files so frontend
contributors can use the same conversion settings and produce consistent
results.

## Installation

Create and activate a virtual environment, then install VTracer:

```bash
python3 -m venv venv
source venv/bin/activate
python3 -m pip install vtracer==1.0.0a4
```

## Usage

```bash
python3 vtracer_convert.py input.jpg output.svg
```

Optional parameters:

```bash
python3 vtracer_convert.py input.jpg output.svg \
  --colors 10 \
  --simplify 2.2
```

## Dependency and Attribution

This utility uses [VTracer](https://github.com/visioncortex/vtracer), an
open-source raster-to-vector graphics converter distributed under the MIT
License.
