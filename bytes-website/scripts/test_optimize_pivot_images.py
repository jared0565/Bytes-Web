"""Tests for optimize-pivot-images.py, run on made-up images in a temporary folder.

    python -P -m pytest -q bytes-website/scripts/test_optimize_pivot_images.py

Needs pytest and Pillow. The real images under public/projects are never touched.
"""
import importlib.util
from pathlib import Path

import pytest
from PIL import Image

HERE = Path(__file__).resolve().parent
SCRIPT = HERE / 'optimize-pivot-images.py'
spec = importlib.util.spec_from_file_location('optimize_pivot_images', SCRIPT)
optimizer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(optimizer)

WHITE, SIDEBAR_GREY, INK = (255, 255, 255), (30, 30, 30), (20, 90, 200)


def frame(path, content_bottom_row=300):
    """A 1440 px workspace frame: a dark 240 px sidebar and one content block on white."""
    image = Image.new('RGB', (1440, 1000), WHITE)
    image.paste(SIDEBAR_GREY, (0, 0, 240, 1000))
    image.paste(INK, (300, 50, 900, content_bottom_row + 1))
    image.save(path)


def shop(path):
    """A 1440 x 1000 shop capture with more than 256 colours."""
    image = Image.new('RGB', (1440, 1000))
    image.putdata([(x % 256, y % 256, (x + y) % 256) for y in range(1000) for x in range(1440)])
    image.save(path)


@pytest.fixture
def folder(tmp_path):
    for name in optimizer.SHOPS:
        shop(tmp_path / f'{name}.png')
    for name in optimizer.FRAMES:
        frame(tmp_path / f'{name}.png')
    return tmp_path


def size_and_mode(path):
    with Image.open(path) as image:
        return image.size, image.mode


def test_a_frame_loses_its_sidebar_and_the_space_below_its_content(folder):
    optimizer.main(folder)
    # 1440 - 240 px of sidebar wide; the content's last row (300) + 1 + 40 px of padding tall.
    assert size_and_mode(folder / 'pivot-bookings.png') == ((1200, 341), 'P')


def test_a_frame_whose_content_reaches_the_bottom_stays_1000_px_tall(folder):
    frame(folder / 'pivot-till.png', content_bottom_row=999)
    optimizer.main(folder)
    assert size_and_mode(folder / 'pivot-till.png') == ((1200, 1000), 'P')


def test_a_frame_that_is_already_cropped_is_left_alone(folder):
    path = folder / 'pivot-inventory.png'
    Image.new('RGB', (1200, 341), WHITE).quantize(colors=256).save(path)
    before = path.read_bytes()
    optimizer.main(folder)
    assert path.read_bytes() == before


def test_a_shop_capture_keeps_its_size_and_gets_a_256_colour_palette(folder):
    optimizer.main(folder)
    for name in optimizer.SHOPS:
        path = folder / f'{name}.png'
        assert size_and_mode(path) == ((1440, 1000), 'P')
        with Image.open(path) as image:
            assert len(image.getpalette()) // 3 <= 256


def test_a_second_run_leaves_every_file_byte_identical(folder):
    optimizer.main(folder)
    first = {p.name: p.read_bytes() for p in sorted(folder.glob('*.png'))}
    optimizer.main(folder)
    assert {p.name: p.read_bytes() for p in sorted(folder.glob('*.png'))} == first
    assert len(first) == len(optimizer.SHOPS) + len(optimizer.FRAMES)


def test_the_default_folder_is_found_from_the_script_not_the_working_directory():
    assert optimizer.ROOT.is_absolute()
    assert optimizer.ROOT == HERE.parent / 'public' / 'projects'
    assert (optimizer.ROOT / 'pivot-parlor.png').is_file()
