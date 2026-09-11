package ls.eq.seismic.model;

import lombok.Data;

import java.util.List;

@Data
public class FeatureCollection {
    List<Feature> features;
}
