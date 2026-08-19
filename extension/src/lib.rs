use zed_extension_api as zed;

struct NovelReaderExtension;

impl zed::Extension for NovelReaderExtension {
    fn new() -> Self {
        Self
    }
}

zed::register_extension!(NovelReaderExtension);
